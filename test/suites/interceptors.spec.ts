import {describe, expect, it, vi} from 'vitest'
import {ajax} from '../../src/ajaxInstance'
import {NetworkError} from '../../src/error'
import {fetchInit, fetchUrl, mockJson} from '../helpers/fetch'

describe('request interceptors', () => {
    it('can modify the final URL, params and headers before fetch', async () => {
        mockJson({ok: true})
        const instance = ajax.create({url: 'https://api.example.com'})
        instance.requestInterceptor.add(config => {
            config.url = `${config.url}/v2/items`
            config.params.set('from', 'interceptor')
            config.headers.set('authorization', 'Bearer token')
            return config
        })

        const {config} = await instance.get('', {timeout: 0})

        expect(fetchUrl()).toBe('https://api.example.com/v2/items?from=interceptor')
        expect((fetchInit().headers as Headers).get('authorization')).toBe('Bearer token')
        expect(config.params.get('from')).toBe('interceptor')
    })

    it('runs synchronous and asynchronous interceptors sequentially', async () => {
        mockJson({ok: true})
        const order: string[] = []
        const instance = ajax.create()
        instance.requestInterceptor.add(async config => {
            order.push('first:start')
            await Promise.resolve()
            config.headers.set('x-chain', 'a')
            order.push('first:end')
            return config
        })
        instance.requestInterceptor.add(config => {
            order.push(`second:${config.headers.get('x-chain')}`)
            config.headers.set('x-chain', 'ab')
            return config
        })

        await instance.get('https://api.example.com/data', {timeout: 0})

        expect(order).toStrictEqual(['first:start', 'first:end', 'second:a'])
        expect((fetchInit().headers as Headers).get('x-chain')).toBe('ab')
    })

    it('uses a replacement config object returned by an interceptor', async () => {
        mockJson({ok: true})
        const instance = ajax.create()
        instance.requestInterceptor.add(config => ({
            ...config,
            url: 'https://other.example.com/replaced',
            headers: new Headers({'x-replaced': 'yes'}),
            params: new URLSearchParams('a=1')
        }))

        await instance.get('https://api.example.com/original', {timeout: 0})

        expect(fetchUrl()).toBe('https://other.example.com/replaced?a=1')
        expect((fetchInit().headers as Headers).get('x-replaced')).toBe('yes')
    })

    it('keeps the current config when an interceptor returns a non-object value', async () => {
        mockJson({ok: true})
        const instance = ajax.create()
        instance.requestInterceptor.add((() => undefined) as any)

        await instance.get('https://api.example.com/data', {timeout: 0})

        expect(fetchUrl()).toBe('https://api.example.com/data')
    })

    it('can be deleted and then no longer runs', async () => {
        mockJson({ok: true})
        const instance = ajax.create()
        const interceptor = vi.fn((config: any) => config)
        instance.requestInterceptor.add(interceptor)
        expect(instance.requestInterceptor.delete(interceptor)).toBe(true)

        await instance.get('https://api.example.com/data', {timeout: 0})

        expect(interceptor).not.toHaveBeenCalled()
    })

    it('uses a snapshot so interceptors added during a request run next time only', async () => {
        mockJson({call: 1})
        mockJson({call: 2})
        const instance = ajax.create()
        const late = vi.fn((config: any) => config)
        instance.requestInterceptor.add(config => {
            instance.requestInterceptor.add(late)
            return config
        })

        await instance.get('https://api.example.com/first', {timeout: 0})
        expect(late).not.toHaveBeenCalled()
        await instance.get('https://api.example.com/second', {timeout: 0})
        expect(late).toHaveBeenCalledOnce()
    })

    it('runs a per-request interceptor after instance interceptors', async () => {
        mockJson({ok: true})
        const order: string[] = []
        const instance = ajax.create()
        instance.requestInterceptor.add(config => {
            order.push('instance')
            return config
        })

        await instance.get('https://api.example.com/data', {
            timeout: 0,
            onRequest: config => {
                order.push('request')
                return config
            }
        })

        expect(order).toStrictEqual(['instance', 'request'])
    })

    it('deduplicates the same function used globally and per request', async () => {
        mockJson({ok: true})
        const instance = ajax.create()
        const interceptor = vi.fn((config: any) => config)
        instance.requestInterceptor.add(interceptor)

        await instance.get('https://api.example.com/data', {
            timeout: 0,
            onRequest: interceptor
        })

        expect(interceptor).toHaveBeenCalledOnce()
    })

    it('propagates a request interceptor failure without calling fetch or response interceptors', async () => {
        const instance = ajax.create()
        const onResponse = vi.fn()
        instance.requestInterceptor.add(() => {
            throw new Error('request interceptor failed')
        })
        instance.responseInterceptor.add(onResponse)

        await expect(instance.get('https://api.example.com/data', {timeout: 0}))
            .rejects.toThrow('request interceptor failed')
        expect(fetchMock).not.toHaveBeenCalled()
        expect(onResponse).not.toHaveBeenCalled()
    })
})

describe('response interceptors', () => {
    it('can unwrap a successful AjaxResponse', async () => {
        mockJson({code: 0, data: {id: 7}})
        const instance = ajax.create()
        instance.responseInterceptor.add((response, error) => {
            if (error) throw error
            return response.result.data
        })

        await expect(instance.get('https://api.example.com/item', {timeout: 0}))
            .resolves.toStrictEqual({id: 7})
    })

    it('passes each transformed value to the next interceptor in registration order', async () => {
        mockJson({value: 2})
        const instance = ajax.create()
        const observations: unknown[] = []
        instance.responseInterceptor.add(response => {
            observations.push(response.result)
            return response.result.value * 3
        })
        instance.responseInterceptor.add(response => {
            observations.push(response)
            return response + 1
        })

        const result = await instance.get('https://api.example.com/value', {timeout: 0})

        expect(observations).toStrictEqual([{value: 2}, 6])
        expect(result).toBe(7)
    })

    it('supports asynchronous response interceptors', async () => {
        mockJson({value: 2})
        const instance = ajax.create()
        instance.responseInterceptor.add(async response => {
            await Promise.resolve()
            return response.result.value * 2
        })

        await expect(instance.get('https://api.example.com/value', {timeout: 0})).resolves.toBe(4)
    })

    it('keeps a successful response unchanged when undefined is returned', async () => {
        mockJson({original: true})
        const instance = ajax.create()
        instance.responseInterceptor.add(() => undefined)

        const result = await instance.get('https://api.example.com/data', {timeout: 0})

        expect(result).toMatchObject({result: {original: true}, response: expect.any(Response)})
    })

    it('accepts null as an intentional transformed response', async () => {
        mockJson({original: true})
        const instance = ajax.create()
        instance.responseInterceptor.add(() => null)

        await expect(instance.get('https://api.example.com/data', {timeout: 0})).resolves.toBeNull()
    })

    it('receives NetworkError and can recover from an HTTP failure', async () => {
        mockJson({message: 'missing'}, {status: 404})
        const instance = ajax.create()
        instance.responseInterceptor.add((response, error, config) => {
            expect(response).toBeNull()
            expect(error).toBeInstanceOf(NetworkError)
            expect(config.url).toBe('https://api.example.com/missing')
            return {fallback: true}
        })

        await expect(instance.get('https://api.example.com/missing', {timeout: 0}))
            .resolves.toStrictEqual({fallback: true})
    })

    it('rethrows an error when the interceptor chooses not to recover', async () => {
        mockJson({message: 'denied'}, {status: 403})
        const instance = ajax.create()
        instance.responseInterceptor.add((_response, error) => {
            throw error
        })

        await expect(instance.get('https://api.example.com/denied', {timeout: 0}))
            .rejects.toBeInstanceOf(NetworkError)
    })

    it('allows a later interceptor to recover from an earlier interceptor failure', async () => {
        mockJson({ok: true})
        const instance = ajax.create()
        instance.responseInterceptor.add(() => {
            throw new Error('transform failed')
        })
        instance.responseInterceptor.add((_response, error) => {
            expect(error).toMatchObject({message: 'transform failed'})
            return {recovered: true}
        })

        await expect(instance.get('https://api.example.com/data', {timeout: 0}))
            .resolves.toStrictEqual({recovered: true})
    })

    it('treats undefined on an error path as handled and resolves null', async () => {
        mockJson({message: 'error'}, {status: 500})
        const instance = ajax.create()
        instance.responseInterceptor.add((_response, error) => {
            expect(error).toBeInstanceOf(NetworkError)
            return undefined
        })

        await expect(instance.get('https://api.example.com/error', {timeout: 0})).resolves.toBeNull()
    })

    it('runs a per-request response interceptor after instance interceptors', async () => {
        mockJson({value: 1})
        const instance = ajax.create()
        instance.responseInterceptor.add(response => response.result.value + 1)

        const result = await instance.get('https://api.example.com/value', {
            timeout: 0,
            onResponse: response => response * 5
        })

        expect(result).toBe(10)
    })

    it('deduplicates the same response interceptor used at both levels', async () => {
        mockJson({ok: true})
        const instance = ajax.create()
        const interceptor = vi.fn((response: any) => response)
        instance.responseInterceptor.add(interceptor)

        await instance.get('https://api.example.com/data', {
            timeout: 0,
            onResponse: interceptor
        })

        expect(interceptor).toHaveBeenCalledOnce()
    })
})
