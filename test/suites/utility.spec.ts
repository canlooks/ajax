/**
 * Unit tests for utility functions in src/utility.ts
 */
import { describe, it, expect } from 'vitest'
import { bodyTransform, findBodyBlobs, mergeUrl, mergeParams, mergeHeaders, mergeAbortSignal, mergeConfig, catchCommonError } from '../../src/utility'
import { AjaxError } from '../../src/error'

describe('bodyTransform', () => {
    it('should JSON.stringify a plain object', () => {
        const result = bodyTransform({ name: 'test', value: 42 } as any)
        expect(result).toStrictEqual('{"name":"test","value":42}')
    })

    it('should JSON.stringify an array', () => {
        expect(bodyTransform([1, 2, 3] as any)).toStrictEqual('[1,2,3]')
    })

    it('should pass through a string unchanged', () => {
        expect(bodyTransform('hello')).toStrictEqual('hello')
    })

    it('should pass through null unchanged', () => {
        expect(bodyTransform(null)).toStrictEqual(null)
    })

    it('should pass through undefined unchanged', () => {
        expect(bodyTransform(undefined)).toStrictEqual(undefined)
    })

    it('should pass through Blob unchanged', () => {
        const blob = new Blob(['data'])
        expect(bodyTransform(blob)).toStrictEqual(blob)
    })

    it('should pass through FormData unchanged', () => {
        const fd = new FormData()
        expect(bodyTransform(fd)).toStrictEqual(fd)
    })

    it('should pass through ArrayBuffer unchanged', () => {
        const buf = new ArrayBuffer(8)
        expect(bodyTransform(buf)).toStrictEqual(buf)
    })

    it('should pass through URLSearchParams unchanged', () => {
        const usp = new URLSearchParams({ a: '1' })
        expect(bodyTransform(usp)).toStrictEqual(usp)
    })

    it('should pass through ReadableStream unchanged', () => {
        const stream = new ReadableStream()
        expect(bodyTransform(stream)).toStrictEqual(stream)
    })

    it('should handle circular references by returning original body', () => {
        const obj: any = { a: 1 }
        obj.self = obj
        const result = bodyTransform(obj)
        expect(result).toStrictEqual(obj)
    })

    it('should not JSON.stringify a number', () => {
        expect(bodyTransform(42 as any)).toStrictEqual(42)
    })

    it('should not JSON.stringify a boolean', () => {
        expect(bodyTransform(true as any)).toStrictEqual(true)
    })
})

describe('findBodyBlobs', () => {
    it('should find a single Blob', async () => {
        const blob = new Blob(['hello'])
        const blobs = await findBodyBlobs(blob)
        expect(blobs.length).toStrictEqual(1)
        expect(blobs[0] instanceof Blob).toStrictEqual(true)
    })

    it('should convert ArrayBuffer to Blob', async () => {
        const buf = new ArrayBuffer(8)
        const blobs = await findBodyBlobs(buf)
        expect(blobs.length).toStrictEqual(1)
        expect(blobs[0] instanceof Blob).toStrictEqual(true)
        expect(blobs[0].size).toStrictEqual(8)
    })

    it('should find Blobs inside FormData', async () => {
        const fd = new FormData()
        fd.append('file', new Blob(['data1']))
        fd.append('text', 'plain')
        fd.append('file2', new Blob(['data2']))
        const blobs = await findBodyBlobs(fd)
        expect(blobs.length).toStrictEqual(2)
    })

    it('should find Blobs inside nested objects', async () => {
        const body = { name: 'test', file: new Blob(['hello']) }
        const blobs = await findBodyBlobs(body)
        expect(blobs.length).toStrictEqual(1)
    })

    it('should find Blobs inside arrays', async () => {
        const body = [new Blob(['a']), new Blob(['b'])]
        const blobs = await findBodyBlobs(body)
        expect(blobs.length).toStrictEqual(2)
    })

    it('should handle ReadableStream body', async () => {
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(new Uint8Array([1, 2, 3]))
                controller.close()
            }
        })
        const blobs = await findBodyBlobs(stream)
        expect(blobs.length).toStrictEqual(1)
        expect(blobs[0] instanceof Blob).toStrictEqual(true)
    })

    it('should return empty array for null body', async () => {
        const blobs = await findBodyBlobs(null)
        expect(blobs.length).toStrictEqual(0)
    })

    it('should return empty array for undefined body', async () => {
        const blobs = await findBodyBlobs(undefined)
        expect(blobs.length).toStrictEqual(0)
    })

    it('should return empty array for plain object with no Blobs', async () => {
        const blobs = await findBodyBlobs({ a: 1, b: 'text' })
        expect(blobs.length).toStrictEqual(0)
    })

    it('should find deeply nested Blobs', async () => {
        const body = { level1: { level2: [new Blob(['deep'])] } }
        const blobs = await findBodyBlobs(body)
        expect(blobs.length).toStrictEqual(1)
    })
})

describe('mergeUrl', () => {
    it('should return next when prev is undefined', () => {
        expect(mergeUrl(undefined, 'https://api.example.com')).toStrictEqual('https://api.example.com')
    })
    it('should return prev when next is undefined', () => {
        expect(mergeUrl('https://api.example.com', undefined)).toStrictEqual('https://api.example.com')
    })
    it('should merge relative path onto base URL', () => {
        expect(mergeUrl('https://api.example.com/v1', '/users')).toStrictEqual('https://api.example.com/v1/users')
    })
    it('should merge relative path without leading slash', () => {
        expect(mergeUrl('https://api.example.com/v1', 'users')).toStrictEqual('https://api.example.com/v1/users')
    })
    it('should handle trailing slash on prev with leading slash on next', () => {
        expect(mergeUrl('https://api.example.com/v1/', '/users')).toStrictEqual('https://api.example.com/v1/users')
    })
    it('should handle double-slashes on prev and next (both normalized)', () => {
        expect(mergeUrl('https://api.example.com/v1//', 'users')).toStrictEqual('https://api.example.com/v1/users')
    })
    it('should treat // prefix as protocol-relative (replaces base)', () => {
        expect(mergeUrl('https://api.example.com/v1', '//cdn.example.com/file.js')).toStrictEqual('//cdn.example.com/file.js')
    })
    it('should replace base URL when next has http:// protocol', () => {
        expect(mergeUrl('https://api.example.com/v1', 'http://other.com/data')).toStrictEqual('http://other.com/data')
    })
    it('should replace base URL when next starts with //', () => {
        expect(mergeUrl('https://api.example.com/v1', '//cdn.example.com/file.js')).toStrictEqual('//cdn.example.com/file.js')
    })
    it('should handle URL objects', () => {
        expect(mergeUrl(new URL('https://api.example.com/v1/sub'), new URL('https://api.example.com/v1/users')))
            .toStrictEqual('https://api.example.com/v1/users')
    })
    it('should return undefined when both are undefined', () => {
        expect(mergeUrl(undefined, undefined)).toStrictEqual(undefined)
    })
    it('should merge single-segment paths', () => {
        expect(mergeUrl('https://api.example.com/v1', '123')).toStrictEqual('https://api.example.com/v1/123')
    })
})

describe('mergeParams', () => {
    it('should create URLSearchParams from an object', () => {
        const result = mergeParams(undefined, { page: '1', sort: 'name' })
        expect(result instanceof URLSearchParams).toStrictEqual(true)
        expect(result.get('page')).toStrictEqual('1')
        expect(result.get('sort')).toStrictEqual('name')
    })
    it('should create URLSearchParams from a string', () => {
        const result = mergeParams(undefined, 'a=1&b=2')
        expect(result.get('a')).toStrictEqual('1')
        expect(result.get('b')).toStrictEqual('2')
    })
    it('should create URLSearchParams from array of pairs', () => {
        const result = mergeParams(undefined, [['x', '10'], ['y', '20']])
        expect(result.get('x')).toStrictEqual('10')
        expect(result.get('y')).toStrictEqual('20')
    })
    it('should merge prev and next with next overriding', () => {
        const prev = new URLSearchParams({ a: '1', b: '2' })
        const result = mergeParams(prev, { b: 'override', c: '3' })
        expect(result.get('a')).toStrictEqual('1')
        expect(result.get('b')).toStrictEqual('override')
        expect(result.get('c')).toStrictEqual('3')
    })
    it('should not mutate prev URLSearchParams', () => {
        const prev = new URLSearchParams({ x: '1' })
        mergeParams(prev, { y: '2' })
        expect(prev.get('y')).toStrictEqual(null)
        expect(prev.get('x')).toStrictEqual('1')
    })
    it('should return next when prev is undefined', () => {
        const next = new URLSearchParams({ k: 'v' })
        expect(mergeParams(undefined, next)).toStrictEqual(next)
    })
    it('should copy prev when next is undefined', () => {
        const prev = new URLSearchParams({ k: 'v' })
        const result = mergeParams(prev, undefined)
        expect(result.get('k')).toStrictEqual('v')
        expect(result !== prev).toStrictEqual(true)
    })
})

describe('mergeHeaders', () => {
    it('should create Headers from an object', () => {
        const result = mergeHeaders(undefined, { 'Content-Type': 'application/json' })
        expect(result instanceof Headers).toStrictEqual(true)
        expect(result.get('content-type')).toStrictEqual('application/json')
    })
    it('should merge prev and next with next overriding', () => {
        const prev = new Headers({ 'x-a': '1', 'x-b': '2' })
        const result = mergeHeaders(prev, { 'x-b': 'override', 'x-c': '3' })
        expect(result.get('x-a')).toStrictEqual('1')
        expect(result.get('x-b')).toStrictEqual('override')
        expect(result.get('x-c')).toStrictEqual('3')
    })
    it('should not mutate prev Headers', () => {
        const prev = new Headers({ 'x-original': 'yes' })
        mergeHeaders(prev, { 'x-new': 'no' })
        expect(prev.get('x-new')).toStrictEqual(null)
        expect(prev.get('x-original')).toStrictEqual('yes')
    })
    it('should accept Headers instance as next', () => {
        const prev = new Headers({ 'x-a': '1' })
        const next = new Headers({ 'x-b': '2' })
        const result = mergeHeaders(prev, next)
        expect(result.get('x-a')).toStrictEqual('1')
        expect(result.get('x-b')).toStrictEqual('2')
    })
})

describe('mergeAbortSignal', () => {
    it('should return next when prev is null', () => {
        const next = new AbortController().signal
        expect(mergeAbortSignal(null, next)).toStrictEqual(next)
    })
    it('should return prev when next is null', () => {
        const prev = new AbortController().signal
        expect(mergeAbortSignal(prev, null)).toStrictEqual(prev)
    })
    it('should trigger merged signal when prev is aborted', () => new Promise<void>((done) => {
        const ac1 = new AbortController()
        const ac2 = new AbortController()
        const merged = mergeAbortSignal(ac1.signal, ac2.signal)
        expect(merged instanceof AbortSignal).toStrictEqual(true)
        expect(merged!.aborted).toStrictEqual(false)
        merged!.addEventListener('abort', () => {
            expect(merged!.aborted).toStrictEqual(true)
            done()
        })
        ac1.abort()
    }))
    it('should trigger merged signal when next is aborted', () => new Promise<void>((done) => {
        const ac1 = new AbortController()
        const ac2 = new AbortController()
        const merged = mergeAbortSignal(ac1.signal, ac2.signal)
        merged!.addEventListener('abort', () => {
            expect(merged!.aborted).toStrictEqual(true)
            done()
        })
        ac2.abort()
    }))
})

describe('mergeConfig', () => {
    it('should merge URLs across configs', () => {
        const result = mergeConfig(
            { url: 'https://api.example.com' },
            { url: '/v1' },
            { url: '/users' }
        )
        expect(result.url).toStrictEqual('https://api.example.com/v1/users')
    })
    it('should merge params across configs', () => {
        const result = mergeConfig({ params: { base: '1' } }, { params: { req: '2' } })
        expect(result.params.get('base')).toStrictEqual('1')
        expect(result.params.get('req')).toStrictEqual('2')
    })
    it('should merge headers across configs', () => {
        const result = mergeConfig({ headers: { 'x-a': '1' } }, { headers: { 'x-b': '2' } })
        expect(result.headers.get('x-a')).toStrictEqual('1')
        expect(result.headers.get('x-b')).toStrictEqual('2')
    })
    it('should spread all config properties', () => {
        const result = mergeConfig(
            { timeout: 10000 },
            { method: 'POST' as any, body: 'data' }
        )
        expect(result.timeout).toStrictEqual(10000)
        expect(result.method).toStrictEqual('POST')
        expect(result.body).toStrictEqual('data')
    })
    it('should handle undefined configs gracefully', () => {
        const result = mergeConfig(undefined, { url: '/test' }, undefined)
        expect(result.url).toStrictEqual('/test')
    })
    it('should handle single config call (reduced directly)', () => {
        const result = mergeConfig({ url: '/test' })
        expect(result.url).toStrictEqual('/test')
    })
    it('should handle two configs merging', () => {
        const result = mergeConfig(
            { params: { a: '1' } },
            { headers: { 'x-b': '2' } }
        )
        expect(result.params.get('a')).toStrictEqual('1')
        expect(result.headers.get('x-b')).toStrictEqual('2')
    })
})

describe('catchCommonError', () => {
    it('should pass through AjaxError unchanged', () => {
        const err = new AjaxError('original', { config: {} as any })
        const result = catchCommonError(err, (msg?: string) => new Error(`wrapped: ${msg}`))
        expect(result).toStrictEqual(err)
    })

    it('should wrap a standard Error', () => {
        const factory = (msg?: string) => new Error(`wrapped: ${msg}`)
        const result = catchCommonError(new Error('broke'), factory)
        expect(result).toBeInstanceOf(Error)
        expect(result.message).toStrictEqual('wrapped: broke')
    })
})
