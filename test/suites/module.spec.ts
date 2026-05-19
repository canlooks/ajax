/**
 * Unit tests for module system (Service class & decorators) in src/module.ts
 */
import { describe, it, expect } from 'vitest'
import { Service, Config, RequestInterceptor, ResponseInterceptor } from '../../src/module'

describe('Module System', () => {
    describe('Service base class', () => {
        it('should have a static ajax instance', () => {
            expect(typeof Service.ajax).toStrictEqual('function')
        })
        it('should have a static config property', () => {
            expect(typeof Service.config).toStrictEqual('object')
            expect(Service.config !== null).toStrictEqual(true)
        })
        it('should have resolvedConfig getter', () => {
            expect(typeof Service.resolvedConfig).toStrictEqual('object')
        })
        it('should have all method aliases as functions', () => {
            expect(typeof Service.get).toStrictEqual('function')
            expect(typeof Service.post).toStrictEqual('function')
            expect(typeof Service.put).toStrictEqual('function')
            expect(typeof Service.patch).toStrictEqual('function')
            expect(typeof Service.delete).toStrictEqual('function')
            expect(typeof Service.head).toStrictEqual('function')
            expect(typeof Service.options).toStrictEqual('function')
        })
    })

    describe('@Config decorator', () => {
        it('should set static config on decorated class', () => {
            @Config({ url: 'https://api.example.com/v1', timeout: 5000 })
            class TestService extends Service {}
            expect(TestService.config.url).toStrictEqual('https://api.example.com/v1')
            expect(TestService.config.timeout).toStrictEqual(5000)
        })
        it('should create a new ajax instance for decorated class', () => {
            @Config({ url: 'https://api.example.com' })
            class TestService extends Service {}
            expect(TestService.ajax !== Service.ajax).toStrictEqual(true)
        })
        it('should resolve config through resolvedConfig', () => {
            @Config({ url: 'https://api.example.com/v1' })
            class TestService extends Service {}
            expect(TestService.resolvedConfig.url).toStrictEqual('https://api.example.com/v1')
        })
    })

    describe('@RequestInterceptor decorator', () => {
        it('should register a request interceptor on the class', () => {
            @Config({ url: 'https://api.example.com' })
            class TestService extends Service {
                @RequestInterceptor
                static addHeader(config: any) {
                    config.headers.set('x-custom', 'test')
                    return config
                }
            }
            expect(TestService.ajax.requestInterceptor.size > 0).toStrictEqual(true)
        })
        it('should work as factory @RequestInterceptor()', () => {
            @Config({ url: 'https://api.example.com' })
            class TestService2 extends Service {
                @RequestInterceptor()
                static addHeader(config: any) {
                    config.headers.set('x-factory', 'yes')
                    return config
                }
            }
            expect(TestService2.ajax.requestInterceptor.size > 0).toStrictEqual(true)
        })
    })

    describe('@ResponseInterceptor decorator', () => {
        it('should register a response interceptor on the class', () => {
            @Config({ url: 'https://api.example.com' })
            class TestService extends Service {
                @ResponseInterceptor
                static handleResponse(response: any, error: any) {
                    if (error) throw error
                    return response
                }
            }
            expect(TestService.ajax.responseInterceptor.size > 0).toStrictEqual(true)
        })
        it('should work as factory @ResponseInterceptor()', () => {
            @Config({ url: 'https://api.example.com' })
            class TestService2 extends Service {
                @ResponseInterceptor()
                static handleResponse(response: any, error: any) {
                    if (error) throw error
                    return response
                }
            }
            expect(TestService2.ajax.responseInterceptor.size > 0).toStrictEqual(true)
        })
    })

    describe('Module inheritance', () => {
        it('should inherit parent config and merge URLs', () => {
            @Config({ url: 'https://api.example.com/v1' })
            class BaseApi extends Service {}
            @Config({ url: '/users' })
            class UserApi extends BaseApi {}
            expect(UserApi.resolvedConfig.url).toStrictEqual('https://api.example.com/v1/users')
        })
        it('should inherit parent request interceptors', () => {
            @Config({ url: 'https://api.example.com' })
            class BaseApi extends Service {
                @RequestInterceptor
                static addAuth(config: any) {
                    config.headers.set('authorization', 'bearer token')
                    return config
                }
            }
            @Config({ url: '/users' })
            class UserApi extends BaseApi {}
            expect(UserApi.ajax.requestInterceptor.size >= 1).toStrictEqual(true)
        })
        it('should not affect parent when child adds interceptors', () => {
            @Config({ url: 'https://api.example.com' })
            class BaseApi extends Service {}
            const baseSize = BaseApi.ajax.requestInterceptor.size
            @Config({ url: '/users' })
            class UserApi extends BaseApi {
                @RequestInterceptor
                static addHeader(config: any) {
                    config.headers.set('x-child', 'yes')
                    return config
                }
            }
            expect(BaseApi.ajax.requestInterceptor.size).toStrictEqual(baseSize)
            expect(UserApi.ajax.requestInterceptor.size > baseSize).toStrictEqual(true)
        })
        it('should support deep inheritance chain', () => {
            @Config({ url: 'https://api.example.com/v1' })
            class Level1 extends Service {}
            @Config({ url: '/admin' })
            class Level2 extends Level1 {}
            @Config({ url: '/users' })
            class Level3 extends Level2 {}
            expect(Level3.resolvedConfig.url).toStrictEqual('https://api.example.com/v1/admin/users')
        })
    })

    describe('Service method return types', () => {
        it('should have all HTTP method aliases accessible', () => {
            @Config({ url: 'https://api.example.com' })
            class Api extends Service {}
            expect(typeof Api.get).toStrictEqual('function')
            expect(typeof Api.post).toStrictEqual('function')
            expect(typeof Api.put).toStrictEqual('function')
            expect(typeof Api.patch).toStrictEqual('function')
            expect(typeof Api.delete).toStrictEqual('function')
            expect(typeof Api.head).toStrictEqual('function')
            expect(typeof Api.options).toStrictEqual('function')
        })
    })
})
