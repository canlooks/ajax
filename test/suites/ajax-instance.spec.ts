/**
 * Unit tests for ajax instance & create() in src/ajaxInstance.ts
 */
import { describe, it, expect } from 'vitest'
import { ajax } from '../../src/ajaxInstance'
import { mergeConfig } from '../../src/utility'

describe('Ajax Instance', () => {
    describe('default instance', () => {
        it('should export a default ajax instance', () => {
            expect(typeof ajax).toBe('function')
        })
        it('should have config, create, interceptors, and all aliases', () => {
            expect(typeof ajax.config).toBe('object')
            expect(ajax.config !== null).toBe(true)
            expect(typeof ajax.create).toBe('function')
            expect(ajax.requestInterceptor).toBeInstanceOf(Set)
            expect(ajax.responseInterceptor).toBeInstanceOf(Set)
            for (const m of ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']) {
                expect(typeof (ajax as any)[m]).toBe('function')
            }
        })
    })

    describe('create()', () => {
        it('should return a new independent instance', () => {
            const instance = ajax.create()
            expect(typeof instance).toBe('function')
            expect(instance).not.toBe(ajax)
        })
        it('should inherit and merge parent config', () => {
            const parent = ajax.create({ url: 'https://api.example.com/v1' })
            const child = parent.create({ url: '/users' })
            expect(mergeConfig(parent.config, child.config).url).toBe('https://api.example.com/v1/users')
        })
        it('should inherit parent interceptors', () => {
            const parent = ajax.create()
            const reqFn = (c: any) => c
            const resFn = (_r: any, _e: any, _c: any) => {}
            parent.requestInterceptor.add(reqFn)
            parent.responseInterceptor.add(resFn)
            const child = parent.create()
            expect(child.requestInterceptor.has(reqFn)).toBe(true)
            expect(child.responseInterceptor.has(resFn)).toBe(true)
        })
        it('should have independent interceptors after creation', () => {
            const parent = ajax.create()
            const child = parent.create()
            const fn = (c: any) => c
            child.requestInterceptor.add(fn)
            expect(parent.requestInterceptor.has(fn)).toBe(false)
            expect(child.requestInterceptor.has(fn)).toBe(true)
        })
        it('should support chained instances', () => {
            const v1 = ajax.create({ url: 'https://api.example.com/v1' })
            expect(mergeConfig(v1.config, v1.create({ url: '/users' }).config).url).toBe('https://api.example.com/v1/users')
            expect(mergeConfig(v1.config, v1.create({ url: '/posts' }).config).url).toBe('https://api.example.com/v1/posts')
        })
    })
})
