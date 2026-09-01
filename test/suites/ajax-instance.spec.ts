import {describe, expect, it, vi} from 'vitest'
import {ajax} from '../../src/ajaxInstance'
import {AbortError} from '../../src/error'
import {withoutAbortSignalAny} from '../helpers/abort'
import {fetchInit, fetchUrl, mockJson, mockPendingUntilAbort} from '../helpers/fetch'

describe('ajax instance', () => {
    it('is callable and exposes configuration, factories, interceptor sets and aliases', () => {
        expect(ajax).toEqual(expect.any(Function))
        expect(ajax.config).toEqual({})
        expect(ajax.create).toEqual(expect.any(Function))
        expect(ajax.requestInterceptor).toBeInstanceOf(Set)
        expect(ajax.responseInterceptor).toBeInstanceOf(Set)
        for (const method of ['get', 'delete', 'head', 'options', 'post', 'put', 'patch'] as const) {
            expect(ajax[method]).toEqual(expect.any(Function))
        }
    })

    it('creates a distinct child with a fully merged config snapshot', () => {
        const parent = ajax.create({
            url: 'https://api.example.com/v1',
            params: {locale: 'en', page: '1'},
            headers: {'x-parent': 'yes'},
            timeout: 5000
        })
        const child = parent.create({
            url: '/users',
            params: {page: '2'},
            headers: {'x-child': 'yes'}
        })

        expect(child).not.toBe(parent)
        expect(child.config).toMatchObject({
            url: 'https://api.example.com/v1/users',
            timeout: 5000
        })
        expect(child.config.params).toBeInstanceOf(URLSearchParams)
        expect((child.config.params as URLSearchParams).toString()).toBe('locale=en&page=2')
        expect(child.config.headers).toBeInstanceOf(Headers)
        expect((child.config.headers as Headers).get('x-parent')).toBe('yes')
        expect((child.config.headers as Headers).get('x-child')).toBe('yes')
    })

    it('supports arbitrarily nested URL scopes', () => {
        const v1 = ajax.create({url: 'https://api.example.com/v1'})
        const admin = v1.create({url: '/admin'})
        const users = admin.create({url: '/users'})

        expect(users.config.url).toBe('https://api.example.com/v1/admin/users')
    })

    it('merges child defaults again with request-level config', async () => {
        mockJson({ok: true})
        const instance = ajax.create({
            url: 'https://api.example.com/v1',
            params: {locale: 'en', page: '1'},
            headers: {'x-default': 'base'}
        })

        const {config} = await instance.get('/items', {
            params: {page: '3', sort: 'name'},
            headers: {'x-default': 'request', 'x-request': 'yes'},
            timeout: 0
        })

        expect(fetchUrl()).toBe('https://api.example.com/v1/items?locale=en&page=3&sort=name')
        expect((fetchInit().headers as Headers).get('x-default')).toBe('request')
        expect((fetchInit().headers as Headers).get('x-request')).toBe('yes')
        expect(config.url).toBe('https://api.example.com/v1/items')
    })

    it('allows an absolute request URL to replace all inherited URL scopes', async () => {
        mockJson({ok: true})
        const instance = ajax.create({url: 'https://api.example.com/v1'})

        await instance.get('https://other.example.com/data', {timeout: 0})

        expect(fetchUrl()).toBe('https://other.example.com/data')
    })

    it('copies parent interceptor sets at creation time', () => {
        const parent = ajax.create()
        const requestInterceptor = (config: any) => config
        const responseInterceptor = (response: any) => response
        parent.requestInterceptor.add(requestInterceptor)
        parent.responseInterceptor.add(responseInterceptor)

        const child = parent.create()

        expect(child.requestInterceptor).not.toBe(parent.requestInterceptor)
        expect(child.responseInterceptor).not.toBe(parent.responseInterceptor)
        expect(child.requestInterceptor.has(requestInterceptor)).toBe(true)
        expect(child.responseInterceptor.has(responseInterceptor)).toBe(true)
    })

    it('keeps parent and child interceptor changes independent after creation', () => {
        const parent = ajax.create()
        const child = parent.create()
        const parentOnly = (config: any) => config
        const childOnly = (config: any) => config

        parent.requestInterceptor.add(parentOnly)
        child.requestInterceptor.add(childOnly)

        expect(child.requestInterceptor.has(parentOnly)).toBe(false)
        expect(parent.requestInterceptor.has(childOnly)).toBe(false)
    })

    it('copies mutable standard inputs when creating from the singleton', async () => {
        mockJson({ok: true})
        const headers = new Headers({'x-version': '1'})
        const params = new URLSearchParams({locale: 'en'})
        const config = {url: 'https://api.example.com', headers, params}
        const instance = ajax.create(config)

        config.url = 'https://api.example.com/v2'
        headers.set('x-version', '2')
        params.set('locale', 'zh')

        await instance.get('/items', {timeout: 0})

        expect(instance.config).not.toBe(config)
        expect(instance.config.headers).not.toBe(headers)
        expect(instance.config.params).not.toBe(params)
        expect((instance.config.headers as Headers).get('x-version')).toBe('1')
        expect((instance.config.params as URLSearchParams).get('locale')).toBe('en')
        expect(fetchUrl()).toBe('https://api.example.com/items?locale=en')
        expect((fetchInit().headers as Headers).get('x-version')).toBe('1')
    })

    it('copies mutable standard inputs when creating from a child instance', () => {
        const parent = ajax.create({
            url: 'https://api.example.com',
            headers: {'x-parent': 'yes'},
            params: {scope: 'parent'}
        })
        const headers = new Headers({'x-child': 'yes'})
        const params = new URLSearchParams({scope: 'child'})
        const child = parent.create({headers, params})

        headers.set('x-child', 'changed')
        params.set('scope', 'changed')

        expect(child.config.headers).not.toBe(headers)
        expect(child.config.params).not.toBe(params)
        expect((child.config.headers as Headers).get('x-parent')).toBe('yes')
        expect((child.config.headers as Headers).get('x-child')).toBe('yes')
        expect((child.config.params as URLSearchParams).get('scope')).toBe('child')
    })

    it('handles create() without a config', async () => {
        mockJson({ok: true})
        const instance = ajax.create()

        await instance.get('https://api.example.com/data', {timeout: 0})

        expect(instance.config).toEqual(expect.objectContaining({
            params: expect.any(URLSearchParams),
            headers: expect.any(Headers)
        }))
    })

    it('supports concurrent snapshot reads without sharing resolved request configs', async () => {
        fetchMock.mockResponses(
            [JSON.stringify({id: 1}), {headers: {'content-type': 'application/json'}}],
            [JSON.stringify({id: 2}), {headers: {'content-type': 'application/json'}}]
        )
        const headers = new Headers({'x-version': '1'})
        const params = new URLSearchParams({locale: 'en'})
        const instance = ajax.create({url: 'https://api.example.com', headers, params})
        headers.set('x-version', '2')
        params.set('locale', 'zh')
        const observe = vi.fn((config: any) => config)
        instance.requestInterceptor.add(observe)

        const [first, second] = await Promise.all([
            instance.get('/first', {params: {id: '1'}, timeout: 0}),
            instance.get('/second', {params: {id: '2'}, timeout: 0})
        ])

        expect(first.config).not.toBe(second.config)
        expect(first.config.headers).not.toBe(second.config.headers)
        expect(first.config.params).not.toBe(second.config.params)
        expect(first.config.url).toBe('https://api.example.com/first')
        expect(second.config.url).toBe('https://api.example.com/second')
        expect(first.config.headers.get('x-version')).toBe('1')
        expect(second.config.headers.get('x-version')).toBe('1')
        expect(first.config.params.get('locale')).toBe('en')
        expect(second.config.params.get('locale')).toBe('en')
        expect(observe).toHaveBeenCalledTimes(2)
    })

    it('does not register fallback listeners while creating instances and cleans every normal request', async () => {
        await withoutAbortSignalAny(async () => {
            const parentController = new AbortController()
            const addParent = vi.spyOn(parentController.signal, 'addEventListener')
            const removeParent = vi.spyOn(parentController.signal, 'removeEventListener')
            const parent = ajax.create({
                url: 'https://api.example.com',
                signal: parentController.signal
            })
            const children = Array.from({length: 25}, () => {
                const childController = new AbortController()
                return parent.create({signal: childController.signal})
            })

            expect(addParent).not.toHaveBeenCalled()

            for (const [index, child] of children.entries()) {
                mockJson({index})
                await child.get(`/items/${index}`, {timeout: 0})
            }

            expect(addParent).toHaveBeenCalledTimes(25)
            expect(removeParent).toHaveBeenCalledTimes(25)
        })
    })

    it('cleans fallback listeners when a request interceptor throws before core', async () => {
        await withoutAbortSignalAny(async () => {
            const parentController = new AbortController()
            const requestController = new AbortController()
            const removeParent = vi.spyOn(parentController.signal, 'removeEventListener')
            const removeRequest = vi.spyOn(requestController.signal, 'removeEventListener')
            const instance = ajax.create({
                url: 'https://api.example.com',
                signal: parentController.signal
            })
            instance.requestInterceptor.add(() => {
                throw new Error('interceptor failed')
            })

            await expect(instance.get('/items', {
                signal: requestController.signal,
                timeout: 0
            })).rejects.toThrow('interceptor failed')

            expect(fetchMock).not.toHaveBeenCalled()
            expect(removeParent).toHaveBeenCalledOnce()
            expect(removeRequest).toHaveBeenCalledOnce()
        })
    })

    it('creates a fresh fallback scope after a previous request was cleaned up', async () => {
        await withoutAbortSignalAny(async () => {
            const parentController = new AbortController()
            const firstRequestController = new AbortController()
            const secondRequestController = new AbortController()
            const addParent = vi.spyOn(parentController.signal, 'addEventListener')
            const removeParent = vi.spyOn(parentController.signal, 'removeEventListener')
            const instance = ajax.create({
                url: 'https://api.example.com',
                signal: parentController.signal
            })

            mockJson({ok: true})
            await instance.get('/first', {
                signal: firstRequestController.signal,
                timeout: 0
            })

            mockPendingUntilAbort()
            const request = instance.get('/second', {
                signal: secondRequestController.signal,
                timeout: 0
            })
            const rejection = expect(request).rejects.toBeInstanceOf(AbortError)
            await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
            secondRequestController.abort(new Error('cancel second request'))

            await rejection
            expect(addParent).toHaveBeenCalledTimes(2)
            expect(removeParent).toHaveBeenCalledTimes(2)
        })
    })
})
