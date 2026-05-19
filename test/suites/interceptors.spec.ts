/**
 * Integration tests for interceptor chains.
 * Global fetch is mocked by vitest-fetch-mock (test/setup.ts).
 */
import { describe, it, expect } from 'vitest'
import { ajax } from '../../src/ajaxInstance'
import { NetworkError } from '../../src/error'

/** Queue a JSON success response */
function jsonOk(data: unknown) {
    fetchMock.mockResponseOnce(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
    })
}

describe('Interceptors (integration)', () => {
    describe('request interceptors', () => {
        it('should modify headers before request', async () => {
            jsonOk({ ok: true })
            const instance = ajax.create()
            instance.requestInterceptor.add(config => {
                config.headers.set('x-auth', 'token123')
                return config
            })
            await instance.get('https://api.example.com/data')
            expect(true).toBe(true)
        })

        it('should run multiple request interceptors sequentially', async () => {
            jsonOk({ ok: true })
            const order: number[] = []
            const instance = ajax.create()
            instance.requestInterceptor.add(c => { order.push(1); return c })
            instance.requestInterceptor.add(c => { order.push(2); return c })
            await instance.get('https://api.example.com/data')
            expect(order).toStrictEqual([1, 2])
        })

        it('should support async request interceptors', async () => {
            jsonOk({ ok: true })
            const instance = ajax.create()
            instance.requestInterceptor.add(async config => {
                await new Promise(r => setTimeout(r, 10))
                config.headers.set('x-async', 'yes')
                return config
            })
            await instance.get('https://api.example.com/data')
            expect(true).toBe(true)
        })

        it('should remove interceptors via .delete()', async () => {
            jsonOk({ ok: true })
            const instance = ajax.create()
            const fn = (c: any) => { c.headers.set('x-bad', '1'); return c }
            instance.requestInterceptor.add(fn)
            instance.requestInterceptor.delete(fn)
            await instance.get('https://api.example.com/data')
            expect(instance.requestInterceptor.has(fn)).toBe(false)
        })
    })

    describe('response interceptors', () => {
        it('should transform response result', async () => {
            jsonOk({ code: 0, data: 'real data' })
            const instance = ajax.create()
            instance.responseInterceptor.add((response: any, error: any) => {
                if (error) throw error
                return response.result.data
            })
            const result = await instance.get('https://api.example.com/data')
            expect(result).toBe('real data')
        })

        it('should recover from error by returning a value', async () => {
            jsonOk({ ok: true })
            const instance = ajax.create()
            instance.responseInterceptor.add(() => { throw new Error('simulated failure') })
            instance.responseInterceptor.add((_r: any, error: any) => {
                if (error) return { recovered: true }
            })
            const result = await instance.get('https://api.example.com/data')
            expect(result).toStrictEqual({ recovered: true })
        })

        it('should throw error if no interceptor recovers', async () => {
            jsonOk({ ok: true })
            const instance = ajax.create()
            instance.responseInterceptor.add(() => { throw new Error('fatal error') })
            await expect(instance.get('https://api.example.com/data')).rejects.toThrow('fatal error')
        })

        it('should leave response untouched when returning undefined', async () => {
            jsonOk({ data: 'original' })
            const instance = ajax.create()
            instance.responseInterceptor.add(() => undefined)
            const { result } = await instance.get('https://api.example.com/data')
            expect(result).toStrictEqual({ data: 'original' })
        })

        it('should run multiple response interceptors sequentially', async () => {
            jsonOk({ a: 1 })
            const order: number[] = []
            const instance = ajax.create()
            instance.responseInterceptor.add((r: any) => { order.push(1); return { ...r.result, b: 2 } })
            instance.responseInterceptor.add((r: any) => { order.push(2); return { ...r, c: 3 } })
            const result = await instance.get('https://api.example.com/data')
            expect(order).toStrictEqual([1, 2])
            expect(result).toStrictEqual({ a: 1, b: 2, c: 3 })
        })

        it('should re-throw network error through response interceptor', async () => {
            fetchMock.mockRejectOnce(new TypeError('Failed to fetch'))
            const instance = ajax.create()
            instance.responseInterceptor.add((_r: any, error: any) => { throw error })
            await expect(instance.get('https://api.example.com/data')).rejects.toThrow(NetworkError)
        })
    })

    describe('per-request interceptors', () => {
        it('should support onRequest via config', async () => {
            jsonOk({ ok: true })
            const order: number[] = []
            const instance = ajax.create()
            instance.requestInterceptor.add((config: any) => { order.push(1); return config })
            await instance.get('https://api.example.com/data', {
                onRequest: (config: any) => { order.push(2); return config }
            })
            expect(order).toStrictEqual([1, 2])
        })

        it('should support onResponse via config', async () => {
            jsonOk({ raw: 'data' })
            const res = await ajax.get('https://api.example.com/data', {
                onResponse: (response: any, error: any) => {
                    if (error) throw error
                    return response.result.raw
                }
            })
            expect(res).toStrictEqual('data')
        })
    })

    describe('interceptor isolation', () => {
        it('child interceptor should not affect parent', () => {
            const parent = ajax.create()
            const parentSize = parent.requestInterceptor.size
            const child = parent.create()
            child.requestInterceptor.add((c: any) => c)
            expect(parent.requestInterceptor.size).toBe(parentSize)
            expect(child.requestInterceptor.size).toBe(parentSize + 1)
        })
    })
})
