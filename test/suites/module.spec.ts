import {describe, expect, it, vi} from 'vitest'
import type {ResolvedConfig} from '../../src'
import {Config, RequestInterceptor, ResponseInterceptor, Service} from '../../src/module'
import {withoutAbortSignalAny} from '../helpers/abort'
import {fetchInit, fetchUrl, mockJson} from '../helpers/fetch'

describe('Service base class', () => {
    it('exposes an isolated ajax instance, config getter and every supported alias', () => {
        expect(Service.ajax).toEqual(expect.any(Function))
        expect(Service.config).toEqual({})
        expect(Service.resolvedConfig).toEqual(expect.objectContaining({
            params: expect.any(URLSearchParams),
            headers: expect.any(Headers)
        }))
        for (const method of ['get', 'delete', 'head', 'options', 'post', 'put', 'patch'] as const) {
            expect(Service[method]).toEqual(expect.any(Function))
        }
    })

    it.each([
        ['get', 'GET'],
        ['delete', 'DELETE'],
        ['head', 'HEAD'],
        ['options', 'OPTIONS']
    ] as const)('%s delegates a bodyless %s request to the class ajax instance', async (alias, method) => {
        @Config({url: 'https://api.example.com/v1'})
        class Api extends Service {}
        mockJson({ok: true})

        await Api[alias]('/resource', {timeout: 0})

        expect(fetchUrl()).toBe('https://api.example.com/v1/resource')
        expect(fetchInit().method).toBe(method)
        expect(fetchInit().body).toBeUndefined()
    })

    it.each([
        ['post', 'POST'],
        ['put', 'PUT'],
        ['patch', 'PATCH']
    ] as const)('%s delegates a body-bearing %s request to the class ajax instance', async (alias, method) => {
        @Config({url: 'https://api.example.com/v1'})
        class Api extends Service {}
        mockJson({ok: true})

        await Api[alias]('/resource', {value: alias}, {timeout: 0})

        expect(fetchUrl()).toBe('https://api.example.com/v1/resource')
        expect(fetchInit().method).toBe(method)
        expect(fetchInit().body).toBe(JSON.stringify({value: alias}))
    })
})

describe('@Config', () => {
    it('stores local config and builds a new ajax instance', () => {
        @Config({url: 'https://api.example.com/v1', timeout: 5000})
        class Api extends Service {}

        expect(Api.config).toStrictEqual({url: 'https://api.example.com/v1', timeout: 5000})
        expect(Api.ajax).not.toBe(Service.ajax)
        expect(Api.resolvedConfig).toMatchObject({
            url: 'https://api.example.com/v1',
            timeout: 5000
        })
    })

    it('merges URL, params, headers and scalar options across inheritance', () => {
        @Config({
            url: 'https://api.example.com/v1',
            params: {locale: 'en', page: '1'},
            headers: {'x-base': 'yes'},
            timeout: 5000
        })
        class BaseApi extends Service {}

        @Config({
            url: '/users',
            params: {page: '2'},
            headers: {'x-child': 'yes'},
            timeout: 1000
        })
        class UserApi extends BaseApi {}

        expect(UserApi.config).toMatchObject({url: '/users', timeout: 1000})
        expect(UserApi.resolvedConfig).toMatchObject({
            url: 'https://api.example.com/v1/users',
            timeout: 1000
        })
        const resolved = UserApi.resolvedConfig as ResolvedConfig
        expect(resolved.params.toString()).toBe('locale=en&page=2')
        expect(resolved.headers.get('x-base')).toBe('yes')
        expect(resolved.headers.get('x-child')).toBe('yes')
    })

    it('supports a deep hierarchy of service URL scopes', () => {
        @Config({url: 'https://api.example.com/v1'})
        class RootApi extends Service {}
        @Config({url: '/admin'})
        class AdminApi extends RootApi {}
        @Config({url: '/users'})
        class UserApi extends AdminApi {}

        expect(UserApi.resolvedConfig.url).toBe('https://api.example.com/v1/admin/users')
    })

    it('defers inherited signal composition until a service request and then cleans it', async () => {
        await withoutAbortSignalAny(async () => {
            const parentController = new AbortController()
            const childController = new AbortController()
            const addParent = vi.spyOn(parentController.signal, 'addEventListener')
            const removeParent = vi.spyOn(parentController.signal, 'removeEventListener')

            @Config({
                url: 'https://api.example.com/v1',
                signal: parentController.signal
            })
            class BaseApi extends Service {}

            @Config({url: '/users', signal: childController.signal})
            class UserApi extends BaseApi {}

            expect(addParent).not.toHaveBeenCalled()
            mockJson({ok: true})
            await UserApi.get('/1', {timeout: 0})

            expect(addParent).toHaveBeenCalledOnce()
            expect(removeParent).toHaveBeenCalledOnce()
        })
    })
})

describe('service interceptor decorators', () => {
    it('ignores a non-function descriptor value defensively', () => {
        class Api extends Service {}
        ;(RequestInterceptor as any)(Api, 'invalid', {value: 42})
        Config({url: 'https://api.example.com'})(Api)

        expect(Api.ajax.requestInterceptor.size).toBe(Service.ajax.requestInterceptor.size)
    })

    it('registers @RequestInterceptor and binds static this to its service class', async () => {
        @Config({url: 'https://api.example.com'})
        class AuthApi extends Service {
            static token = 'service-token'

            @RequestInterceptor
            static authorize(config: any) {
                config.headers.set('authorization', `Bearer ${this.token}`)
                return config
            }
        }
        mockJson({ok: true})

        await AuthApi.get('/private', {timeout: 0})

        expect(AuthApi.ajax.requestInterceptor.size).toBe(1)
        expect((fetchInit().headers as Headers).get('authorization')).toBe('Bearer service-token')
    })

    it('registers @RequestInterceptor() in factory form', async () => {
        @Config({url: 'https://api.example.com'})
        class Api extends Service {
            @RequestInterceptor()
            static tag(config: any) {
                config.headers.set('x-factory-request', 'yes')
                return config
            }
        }
        mockJson({ok: true})

        await Api.get('/data', {timeout: 0})

        expect((fetchInit().headers as Headers).get('x-factory-request')).toBe('yes')
    })

    it('registers @ResponseInterceptor and can transform service results', async () => {
        @Config({url: 'https://api.example.com'})
        class Api extends Service {
            @ResponseInterceptor
            static unwrap(response: any, error: any) {
                if (error) throw error
                return response.result.data
            }
        }
        mockJson({data: {id: 1}})

        await expect(Api.get('/data', {timeout: 0})).resolves.toStrictEqual({id: 1})
        expect(Api.ajax.responseInterceptor.size).toBe(1)
    })

    it('registers @ResponseInterceptor() in factory form', async () => {
        @Config({url: 'https://api.example.com'})
        class Api extends Service {
            @ResponseInterceptor()
            static unwrap(response: any, error: any) {
                if (error) throw error
                return response.result.value
            }
        }
        mockJson({value: 9})

        await expect(Api.get('/data', {timeout: 0})).resolves.toBe(9)
    })

    it('preserves parent interceptors and appends child interceptors', async () => {
        @Config({url: 'https://api.example.com'})
        class BaseApi extends Service {
            @RequestInterceptor
            static base(config: any) {
                config.headers.set('x-base', 'yes')
                return config
            }
        }

        @Config({url: '/users'})
        class UserApi extends BaseApi {
            @RequestInterceptor
            static child(config: any) {
                config.headers.set('x-child', 'yes')
                return config
            }
        }
        mockJson({ok: true})

        await UserApi.get('/1', {timeout: 0})

        expect(UserApi.ajax.requestInterceptor.size).toBe(2)
        expect((fetchInit().headers as Headers).get('x-base')).toBe('yes')
        expect((fetchInit().headers as Headers).get('x-child')).toBe('yes')
    })

    it('does not add a child interceptor back to the parent service', () => {
        @Config({url: 'https://api.example.com'})
        class BaseApi extends Service {}
        const parentSize = BaseApi.ajax.requestInterceptor.size

        @Config({url: '/users'})
        class UserApi extends BaseApi {
            @RequestInterceptor
            static child(config: any) {
                return config
            }
        }

        expect(BaseApi.ajax.requestInterceptor.size).toBe(parentSize)
        expect(UserApi.ajax.requestInterceptor.size).toBe(parentSize + 1)
    })

    it('runs decorated interceptors before per-request interceptors', async () => {
        const order: string[] = []
        @Config({url: 'https://api.example.com'})
        class Api extends Service {
            @RequestInterceptor
            static module(config: any) {
                order.push('module')
                return config
            }
        }
        mockJson({ok: true})

        await Api.get('/data', {
            timeout: 0,
            onRequest: config => {
                order.push('request')
                return config
            }
        })

        expect(order).toStrictEqual(['module', 'request'])
    })
})

describe('service endpoint configuration', () => {
    it('merges endpoint params and headers over service defaults', async () => {
        @Config({
            url: 'https://api.example.com/v1',
            params: {locale: 'en', page: '1'},
            headers: {'x-source': 'service'}
        })
        class Api extends Service {}
        mockJson({ok: true})

        await Api.get('/items', {
            params: {page: '2'},
            headers: {'x-source': 'endpoint'},
            timeout: 0
        })

        expect(fetchUrl()).toBe('https://api.example.com/v1/items?locale=en&page=2')
        expect((fetchInit().headers as Headers).get('x-source')).toBe('endpoint')
    })

    it('allows an endpoint to replace the service URL with an absolute URL', async () => {
        @Config({url: 'https://api.example.com/v1'})
        class Api extends Service {}
        mockJson({ok: true})

        await Api.get('https://other.example.com/data', {timeout: 0})

        expect(fetchUrl()).toBe('https://other.example.com/data')
    })
})
