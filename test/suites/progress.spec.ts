import {describe, expect, it, vi} from 'vitest'
import type {ProgressEvent} from '../../src'
import {ajax} from '../../src/ajaxInstance'
import {AjaxError} from '../../src/error'
import {fetchInit, mockJson, streamResponse} from '../helpers/fetch'

describe('upload progress', () => {
    it('reports cumulative bytes for every Blob in a FormData body', async () => {
        mockJson({uploaded: true})
        const form = new FormData()
        form.append('first', new Blob(['abc']))
        form.append('second', new Blob(['12345']))
        const events: ProgressEvent[] = []

        const {result} = await ajax.post('https://api.example.com/upload', form, {
            onUploadProgress: event => events.push(event)
        })

        expect(result).toStrictEqual({uploaded: true})
        expect(events.length).toBeGreaterThanOrEqual(2)
        expect(events.at(-1)).toMatchObject({loaded: 8, total: 8})
        expect(events.every(event => event.chunk instanceof Uint8Array)).toBe(true)
        expect(events.map(event => event.loaded)).toStrictEqual(
            [...events.map(event => event.loaded)].sort((a, b) => a - b)
        )
    })

    it('reports ArrayBuffer bytes nested in an object', async () => {
        mockJson({ok: true})
        const events: ProgressEvent[] = []

        await ajax.post('https://api.example.com/upload', {
            metadata: 'test',
            payload: new Uint8Array([1, 2, 3, 4]).buffer
        }, {onUploadProgress: event => events.push(event)})

        expect(events.at(-1)).toMatchObject({loaded: 4, total: 4})
    })

    it('does not call the callback when the body contains no binary data', async () => {
        mockJson({ok: true})
        const callback = vi.fn()

        await ajax.post('https://api.example.com/items', {name: 'plain'}, {
            onUploadProgress: callback
        })

        expect(callback).not.toHaveBeenCalled()
    })

    it('disables the default timeout while upload progress is active', async () => {
        mockJson({ok: true})

        await ajax.post('https://api.example.com/upload', new Blob(['x']), {
            onUploadProgress: () => undefined
        })

        expect(fetchInit().signal).toBeUndefined()
    })

    it('wraps an exception from the upload callback as AjaxError', async () => {
        mockJson({ok: true})

        await expect(ajax.post('https://api.example.com/upload', new Blob(['x']), {
            onUploadProgress: () => {
                throw new Error('upload observer failed')
            }
        })).rejects.toMatchObject({
            type: 'ajaxError',
            message: expect.stringContaining('upload observer failed')
        })
    })
})

describe('download progress', () => {
    const chunks = [new Uint8Array([1, 2]), new Uint8Array([3, 4, 5])]

    function mockChunkedResponse(withLength = true) {
        fetchMock.mockImplementationOnce(async () => streamResponse(chunks, {
            headers: withLength ? {'content-length': '5'} : undefined
        }))
    }

    it('accumulates Uint8Array data and reports loaded and total values', async () => {
        mockChunkedResponse()
        const events: ProgressEvent[] = []

        const {result} = await ajax.get('https://api.example.com/file', {
            onDownloadProgress: event => events.push(event)
        })

        expect(result).toBeInstanceOf(Uint8Array)
        expect([...result as Uint8Array]).toStrictEqual([1, 2, 3, 4, 5])
        expect(events).toHaveLength(2)
        expect(events.map(({loaded, total}) => ({loaded, total}))).toStrictEqual([
            {loaded: 2, total: 5},
            {loaded: 5, total: 5}
        ])
        expect([...events[1].chunk]).toStrictEqual([3, 4, 5])
    })

    it('converts accumulated bytes to ArrayBuffer when requested', async () => {
        mockChunkedResponse()

        const {result} = await ajax.get('https://api.example.com/file', {
            responseType: 'arrayBuffer',
            onDownloadProgress: () => undefined
        })

        expect(result).toBeInstanceOf(ArrayBuffer)
        expect([...new Uint8Array(result as ArrayBuffer)]).toStrictEqual([1, 2, 3, 4, 5])
    })

    it('converts accumulated bytes to Blob when requested', async () => {
        mockChunkedResponse()

        const {result} = await ajax.get('https://api.example.com/file', {
            responseType: 'blob',
            onDownloadProgress: () => undefined
        })

        expect(result).toBeInstanceOf(Blob)
        expect([...new Uint8Array(await (result as Blob).arrayBuffer())]).toStrictEqual([1, 2, 3, 4, 5])
    })

    it('falls back to native Blob parsing without Content-Length', async () => {
        mockChunkedResponse(false)
        const callback = vi.fn()

        const {result} = await ajax.get('https://api.example.com/file', {
            responseType: 'blob',
            onDownloadProgress: callback
        })

        expect(result).toBeInstanceOf(Blob)
        expect([...new Uint8Array(await (result as Blob).arrayBuffer())]).toStrictEqual([1, 2, 3, 4, 5])
        expect(callback).not.toHaveBeenCalled()
    })

    it('leaves result undefined and does not consume the stream without Content-Length', async () => {
        mockChunkedResponse(false)
        const callback = vi.fn()

        const {result, response} = await ajax.get('https://api.example.com/file', {
            onDownloadProgress: callback
        })

        expect(result).toBeUndefined()
        expect(callback).not.toHaveBeenCalled()
        expect([...new Uint8Array(await response.arrayBuffer())]).toStrictEqual([1, 2, 3, 4, 5])
    })

    it('handles a response with no body', async () => {
        fetchMock.mockImplementationOnce(async () => new Response(null, {
            headers: {'content-length': '0'}
        }))
        const callback = vi.fn()

        const {result} = await ajax.get('https://api.example.com/empty', {
            onDownloadProgress: callback
        })

        expect(result).toBeUndefined()
        expect(callback).not.toHaveBeenCalled()
    })

    it('disables the default timeout while download progress is active', async () => {
        mockChunkedResponse()

        await ajax.get('https://api.example.com/file', {
            onDownloadProgress: () => undefined
        })

        expect(fetchInit().signal).toBeUndefined()
    })

    it.each(['json', 'text', 'formData'] as const)(
        'rejects responseType %s when download progress is enabled',
        async responseType => {
            mockChunkedResponse()
            await expect(ajax.get('https://api.example.com/file', {
                responseType,
                onDownloadProgress: () => undefined
            })).rejects.toMatchObject({
                type: 'ajaxError',
                message: expect.stringContaining(`responseType: "${responseType}" is not supported`)
            })
        }
    )

    it('wraps an exception from the download callback as AjaxError', async () => {
        vi.useFakeTimers()
        mockChunkedResponse()

        await expect(ajax.get('https://api.example.com/file', {
            timeout: 1000,
            onDownloadProgress: () => {
                throw new Error('download observer failed')
            }
        })).rejects.toMatchObject({
            type: 'ajaxError',
            message: expect.stringContaining('download observer failed')
        })
        expect(vi.getTimerCount()).toBe(0)
    })

    it('wraps a response stream failure as AjaxError', async () => {
        fetchMock.mockImplementationOnce(async () => new Response(new ReadableStream<Uint8Array>({
            start(controller) {
                controller.error(new Error('stream failed'))
            }
        }), {headers: {'content-length': '5'}}))

        await expect(ajax.get('https://api.example.com/file', {
            onDownloadProgress: () => undefined
        })).rejects.toBeInstanceOf(AjaxError)
        await expect(Promise.resolve()).resolves.toBeUndefined()
    })
})
