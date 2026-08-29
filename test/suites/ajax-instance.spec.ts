import {describe, expect, it, vi} from 'vitest'
import {ajax} from '../../src/ajaxInstance'
import {fetchInit, fetchUrl, mockJson} from '../helpers/fetch'

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

    it('captures an independent normalized config snapshot at creation time', async () => {
        mockJson({ok: true})
        const config = {url: 'https://api.example.com', headers: {'x-version': '1'}}
        const instance = ajax.create(config)
        config.url = 'https://api.example.com/v2'

        await instance.get('/items', {timeout: 0})

        expect(instance.config).not.toBe(config)
        expect(instance.config).toEqual(expect.objectContaining({
            url: 'https://api.example.com',
            params: expect.any(URLSearchParams),
            headers: expect.any(Headers)
        }))
        expect(fetchUrl()).toBe('https://api.example.com/items')
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

    it('supports concurrent requests without sharing resolved request configs', async () => {
        fetchMock.mockResponses(
            [JSON.stringify({id: 1}), {headers: {'content-type': 'application/json'}}],
            [JSON.stringify({id: 2}), {headers: {'content-type': 'application/json'}}]
        )
        const instance = ajax.create({url: 'https://api.example.com'})
        const observe = vi.fn((config: any) => config)
        instance.requestInterceptor.add(observe)

        const [first, second] = await Promise.all([
            instance.get('/first', {params: {id: '1'}, timeout: 0}),
            instance.get('/second', {params: {id: '2'}, timeout: 0})
        ])

        expect(first.config).not.toBe(second.config)
        expect(first.config.url).toBe('https://api.example.com/first')
        expect(second.config.url).toBe('https://api.example.com/second')
        expect(observe).toHaveBeenCalledTimes(2)
    })
})
