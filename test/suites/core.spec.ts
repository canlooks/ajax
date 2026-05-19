/**
 * Integration tests for core request functionality.
 * Global fetch is mocked by vitest-fetch-mock (test/setup.ts).
 */
import { describe, it, expect } from 'vitest'
import { ajax } from '../../src/ajaxInstance'
import { NetworkError } from '../../src/error'

// ── Helpers ────────────────────────────────────────────────────────────

/** Queue a JSON success response */
function jsonOk(data: unknown, status = 200) {
    fetchMock.mockResponseOnce(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    })
}

/** Queue a JSON error response */
function jsonError(status: number, body?: unknown) {
    fetchMock.mockResponseOnce(
        JSON.stringify(body ?? { error: `Error ${status}` }),
        { status, headers: { 'Content-Type': 'application/json' } }
    )
}

/** Queue a network failure (fetch throws) */
function networkFail() {
    fetchMock.mockRejectOnce(new TypeError('Failed to fetch'))
}

/** Get the last fetch call's URL */
function lastUrl(): string {
    const calls = fetchMock.mock.calls
    return calls[calls.length - 1]?.[0] as string ?? ''
}

/** Get the last fetch call's init options */
function lastInit(): RequestInit | undefined {
    const calls = fetchMock.mock.calls
    return calls[calls.length - 1]?.[1] as RequestInit | undefined
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('Core Requests (integration)', () => {
    describe('GET request', () => {
        it('should return JSON response', async () => {
            jsonOk({ items: [1, 2, 3] })
            const { result, response, config } = await ajax.get('https://api.example.com/users')
            expect(result).toStrictEqual({ items: [1, 2, 3] })
            expect(response.status).toBe(200)
            expect(config.url).toBe('https://api.example.com/users')
        })

        it('should add query params to URL', async () => {
            jsonOk({ ok: true })
            await ajax.get('https://api.example.com/users', { params: { page: '1', sort: 'name' } })
            expect(lastUrl()).toContain('page=1')
            expect(lastUrl()).toContain('sort=name')
        })

        it('should merge params with existing query string', async () => {
            jsonOk({ ok: true })
            await ajax.get('https://api.example.com/users?base=1', { params: { extra: '2' } })
            expect(lastUrl()).toContain('base=1')
            expect(lastUrl()).toContain('extra=2')
        })

        it('should send custom headers', async () => {
            jsonOk({ ok: true })
            await ajax.get('https://api.example.com/data', { headers: { 'x-custom': 'my-value' } })
            expect(lastInit()?.headers).toBeDefined()
        })
    })

    describe('POST / PUT / PATCH / DELETE', () => {
        it('should send JSON body via POST', async () => {
            jsonOk({ created: true })
            expect((await ajax.post('https://api.example.com/users', { name: 'John' })).result)
                .toStrictEqual({ created: true })
        })
        it('should send FormData body', async () => {
            jsonOk({ uploaded: true })
            const fd = new FormData(); fd.append('file', new Blob(['data']))
            expect((await ajax.post('https://api.example.com/upload', fd)).result)
                .toStrictEqual({ uploaded: true })
        })
        it('PUT', async () => {
            jsonOk({ updated: true })
            expect((await ajax.put('https://api.example.com/u/1', { x: 1 })).result)
                .toStrictEqual({ updated: true })
        })
        it('PATCH', async () => {
            jsonOk({ patched: true })
            expect((await ajax.patch('https://api.example.com/u/1', { x: 1 })).result)
                .toStrictEqual({ patched: true })
        })
        it('DELETE', async () => {
            jsonOk({ deleted: true })
            expect((await ajax.delete('https://api.example.com/u/1')).result)
                .toStrictEqual({ deleted: true })
        })
    })

    describe('responseType', () => {
        it('JSON by default', async () => {
            jsonOk({ key: 'value' })
            expect((await ajax.get('https://api.example.com/data')).result).toStrictEqual({ key: 'value' })
        })
        it('text', async () => {
            fetchMock.mockResponseOnce('plain text', { headers: { 'Content-Type': 'text/plain' } })
            expect((await ajax.get('https://api.example.com/data', { responseType: 'text' })).result).toBe('plain text')
        })
        it('blob', async () => {
            fetchMock.mockResponseOnce(new Blob(['binary']), { headers: { 'Content-Type': 'application/octet-stream' } })
            expect((await ajax.get('https://api.example.com/data', { responseType: 'blob' })).result).toBeInstanceOf(Blob)
        })
        it('arrayBuffer', async () => {
            fetchMock.mockResponseOnce(new Uint8Array([1, 2, 3]).buffer, { headers: { 'Content-Type': 'application/octet-stream' } })
            expect((await ajax.get('https://api.example.com/data', { responseType: 'arrayBuffer' })).result).toBeInstanceOf(ArrayBuffer)
        })
        it('none → undefined result', async () => {
            fetchMock.mockResponseOnce('{}', { headers: { 'Content-Type': 'application/json' } })
            expect((await ajax.get('https://api.example.com/data', { responseType: 'none' })).result).toBeUndefined()
        })
    })

    describe('error handling', () => {
        it('404 → NetworkError', async () => {
            jsonError(404)
            await expect(ajax.get('https://api.example.com/missing')).rejects.toThrow(NetworkError)
        })
        it('500 → NetworkError', async () => {
            jsonError(500)
            await expect(ajax.get('https://api.example.com/error')).rejects.toThrow(NetworkError)
        })
        it('fetch failure → NetworkError', async () => {
            networkFail()
            await expect(ajax.get('https://api.example.com/data')).rejects.toThrow(NetworkError)
        })
        it('error cause contains config', async () => {
            jsonError(403)
            try { await ajax.get('https://api.example.com/forbidden') } catch (e: any) {
                expect(e.cause.config.url).toBe('https://api.example.com/forbidden')
            }
        })
    })

    describe('timeout', () => {
        it('should throw NetworkError on aborted fetch', async () => {
            fetchMock.mockAbortOnce()
            await expect(ajax.get('https://api.example.com/slow', { timeout: 10 })).rejects.toThrow(NetworkError)
        })
        it('should not timeout when timeout is 0', async () => {
            jsonOk({ ok: true })
            expect((await ajax.get('https://api.example.com/data', { timeout: 0 })).result)
                .toStrictEqual({ ok: true })
        })
    })

    describe('abort signal', () => {
        it('should throw NetworkError on aborted fetch', async () => {
            fetchMock.mockAbortOnce()
            await expect(ajax.get('https://api.example.com/data')).rejects.toThrow(NetworkError)
        })
    })

    describe('URL merging', () => {
        it('should merge instance base URL with request path', async () => {
            jsonOk({ ok: true })
            const api = ajax.create({ url: 'https://api.example.com/v1' })
            await api.get('/users')
            expect(lastUrl()).toBe('https://api.example.com/v1/users')
        })
        it('should replace base URL when request uses absolute URL', async () => {
            jsonOk({ ok: true })
            const api = ajax.create({ url: 'https://api.example.com/v1' })
            await api.get('https://other.example.com/data')
            expect(lastUrl()).toBe('https://other.example.com/data')
        })
    })

    describe('AjaxResponse shape', () => {
        it('should return result, response, and config', async () => {
            jsonOk({ data: 'test' })
            const res = await ajax.get('https://api.example.com/data')
            expect(res).toHaveProperty('result')
            expect(res).toHaveProperty('response')
            expect(res).toHaveProperty('config')
            expect(res.response).toBeInstanceOf(Response)
        })
    })
})
