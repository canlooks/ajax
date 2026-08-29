import {describe, expect, it} from 'vitest'
import {ajax} from '../../src/ajaxInstance'
import {AjaxError, NetworkError, TimeoutError} from '../../src/error'
import {fetchInit, fetchUrl, mockJson, mockText} from '../helpers/fetch'

describe('core request pipeline', () => {
    describe('request construction', () => {
        it('requires a URL and does not call fetch when it is missing', async () => {
            await expect(ajax()).rejects.toThrow(new TypeError('"url" is required'))
            expect(fetchMock).not.toHaveBeenCalled()
        })

        it('supports direct invocation and returns the resolved request config', async () => {
            mockJson({ok: true})
            const response = await ajax({
                url: new URL('https://api.example.com/items'),
                method: 'POST',
                body: {name: 'book'} as any,
                headers: {'x-client': 'test'},
                params: {page: '2'},
                timeout: 0
            })

            expect(response.result).toStrictEqual({ok: true})
            expect(response.config.url).toBe('https://api.example.com/items')
            expect(response.config.params.get('page')).toBe('2')
            expect(response.config.headers.get('x-client')).toBe('test')
            expect(fetchUrl()).toBe('https://api.example.com/items?page=2')
            expect(fetchInit().body).toBe('{"name":"book"}')
        })

        it('appends encoded params after an existing query string', async () => {
            mockJson({ok: true})
            await ajax.get('https://api.example.com/items?active=true', {
                params: [['search', 'a & b'], ['page', '1']]
            })

            expect(fetchUrl()).toBe('https://api.example.com/items?active=true&search=a+%26+b&page=1')
        })

        it('passes native RequestInit options and normalized headers to fetch', async () => {
            mockJson({ok: true})
            await ajax.get('https://api.example.com/private', {
                cache: 'no-store',
                credentials: 'include',
                headers: new Headers([['x-token', 'secret']]),
                redirect: 'manual',
                timeout: 0
            })

            const init = fetchInit()
            expect(init.cache).toBe('no-store')
            expect(init.credentials).toBe('include')
            expect(init.redirect).toBe('manual')
            expect(init.headers).toBeInstanceOf(Headers)
            expect((init.headers as Headers).get('x-token')).toBe('secret')
            expect(init.signal).toBeUndefined()
        })

        it.each([
            ['get', 'GET'],
            ['delete', 'DELETE'],
            ['head', 'HEAD'],
            ['options', 'OPTIONS']
        ] as const)('%s alias sends the expected method without a body', async (alias, method) => {
            mockJson({method})
            await ajax[alias](`https://api.example.com/${alias}`, {timeout: 0})

            expect(fetchInit().method).toBe(method)
            expect(fetchInit().body).toBeUndefined()
        })

        it.each([
            ['post', 'POST'],
            ['put', 'PUT'],
            ['patch', 'PATCH']
        ] as const)('%s alias sends the expected method and serialized body', async (alias, method) => {
            mockJson({method})
            await ajax[alias](`https://api.example.com/${alias}`, {value: alias}, {timeout: 0})

            expect(fetchInit().method).toBe(method)
            expect(fetchInit().body).toBe(JSON.stringify({value: alias}))
        })

        it('normalizes a directly configured lowercase method at the transport boundary', async () => {
            mockJson({ok: true})

            const response = await ajax({
                url: 'https://api.example.com/items/1',
                method: 'patch',
                body: {name: 'updated'} as any,
                timeout: 0
            })

            expect(fetchInit().method).toBe('PATCH')
            expect(response.config.method).toBe('PATCH')
        })

        it('passes supported BodyInit values through without JSON serialization', async () => {
            mockJson({uploaded: true})
            const form = new FormData()
            form.append('name', 'avatar')
            form.append('file', new Blob(['image']))

            await ajax.post('https://api.example.com/upload', form, {timeout: 0})

            expect(fetchInit().body).toBe(form)
        })

        it('does not add a Content-Type header automatically for JSON bodies', async () => {
            mockJson({created: true})
            await ajax.post('https://api.example.com/items', {name: 'book'}, {timeout: 0})

            expect((fetchInit().headers as Headers).has('content-type')).toBe(false)
        })
    })

    describe('response parsing', () => {
        it('parses JSON by default and exposes the native Response', async () => {
            mockJson({items: [1, 2, 3]}, {status: 201, statusText: 'Created'})
            const value = await ajax.get('https://api.example.com/items', {timeout: 0})

            expect(value.result).toStrictEqual({items: [1, 2, 3]})
            expect(value.response).toBeInstanceOf(Response)
            expect(value.response.status).toBe(201)
            expect(value.response.statusText).toBe('Created')
        })

        it('parses text responses', async () => {
            mockText('plain text', {headers: {'content-type': 'text/plain'}})
            const {result} = await ajax.get('https://api.example.com/text', {
                responseType: 'text',
                timeout: 0
            })
            expect(result).toBe('plain text')
        })

        it('parses Blob responses', async () => {
            mockText('binary payload', {headers: {'content-type': 'application/octet-stream'}})
            const {result} = await ajax.get('https://api.example.com/blob', {
                responseType: 'blob',
                timeout: 0
            })

            expect(result).toBeInstanceOf(Blob)
            expect(await (result as Blob).text()).toBe('binary payload')
        })

        it('parses ArrayBuffer responses', async () => {
            mockText('bytes')
            const {result} = await ajax.get('https://api.example.com/buffer', {
                responseType: 'arrayBuffer',
                timeout: 0
            })

            expect(result).toBeInstanceOf(ArrayBuffer)
            expect(new TextDecoder().decode(result as ArrayBuffer)).toBe('bytes')
        })

        it('parses multipart form data responses', async () => {
            const form = new FormData()
            form.append('name', 'alice')
            form.append('role', 'admin')
            fetchMock.mockImplementationOnce(async () => new Response(form))

            const {result} = await ajax.get('https://api.example.com/form', {
                responseType: 'formData',
                timeout: 0
            })

            expect(result).toBeInstanceOf(FormData)
            expect((result as FormData).get('name')).toBe('alice')
            expect((result as FormData).get('role')).toBe('admin')
        })

        it('skips body parsing when responseType is none', async () => {
            mockText('not parsed')
            const {result, response} = await ajax.get('https://api.example.com/raw', {
                responseType: 'none',
                timeout: 0
            })

            expect(result).toBeUndefined()
            expect(await response.text()).toBe('not parsed')
        })

        it('supports a bodyless 204 response when parsing is disabled', async () => {
            fetchMock.mockImplementationOnce(async () => new Response(null, {status: 204}))
            const {result, response} = await ajax.get('https://api.example.com/empty', {
                responseType: 'none',
                timeout: 0
            })
            expect(response.status).toBe(204)
            expect(result).toBeUndefined()
        })
    })

    describe('errors', () => {
        it.each([400, 401, 404, 500, 503])('maps HTTP %s to NetworkError with response context', async status => {
            mockJson({error: true}, {status})

            try {
                await ajax.get(`https://api.example.com/status/${status}`, {timeout: 0})
                expect.unreachable('request should reject')
            } catch (error) {
                expect(error).toBeInstanceOf(NetworkError)
                expect(error).toMatchObject({
                    type: 'networkError',
                    message: expect.stringContaining(`status ${status}`),
                    cause: {
                        config: expect.objectContaining({url: `https://api.example.com/status/${status}`}),
                        response: expect.objectContaining({status})
                    }
                })
            }
        })

        it('wraps a fetch Error as NetworkError and preserves its message', async () => {
            fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

            await expect(ajax.get('https://api.example.com/offline', {timeout: 0}))
                .rejects.toMatchObject({type: 'networkError', message: expect.stringContaining('Failed to fetch')})
        })

        it('stringifies a non-Error fetch rejection', async () => {
            fetchMock.mockRejectedValueOnce('offline')

            await expect(ajax.get('https://api.example.com/offline', {timeout: 0}))
                .rejects.toMatchObject({type: 'networkError', message: expect.stringContaining('offline')})
        })

        it('does not double-wrap an existing AjaxError rejected by fetch', async () => {
            const expected = new TimeoutError('upstream timeout', {
                config: {params: new URLSearchParams(), headers: new Headers()} as any
            })
            fetchMock.mockRejectedValueOnce(expected)

            await expect(ajax.get('https://api.example.com/timeout', {timeout: 0})).rejects.toBe(expected)
        })

        it('maps invalid JSON to AjaxError with response and config context', async () => {
            mockText('{invalid json', {headers: {'content-type': 'application/json'}})

            try {
                await ajax.get('https://api.example.com/invalid-json', {timeout: 0})
                expect.unreachable('request should reject')
            } catch (error) {
                expect(error).toBeInstanceOf(AjaxError)
                expect(error).not.toBeInstanceOf(NetworkError)
                expect(error).toMatchObject({
                    type: 'ajaxError',
                    cause: {
                        config: expect.objectContaining({url: 'https://api.example.com/invalid-json'}),
                        response: expect.any(Response)
                    }
                })
            }
        })

        it('reports JSON parsing failure for an empty 204 response under the default responseType', async () => {
            fetchMock.mockImplementationOnce(async () => new Response(null, {status: 204}))
            await expect(ajax.get('https://api.example.com/empty-json', {timeout: 0}))
                .rejects.toBeInstanceOf(AjaxError)
        })
    })
})
