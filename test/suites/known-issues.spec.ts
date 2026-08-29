import {describe, expect, it, vi} from 'vitest'
import {ajax} from '../../src/ajaxInstance'
import {AbortError, NetworkError} from '../../src/error'
import {mergeAbortSignal} from '../../src/utility'
import {mockJson} from '../helpers/fetch'

/**
 * Executable guards for confirmed product defects.
 * Regression guards for defects fixed after the 5.0.5 test report.
 */
describe('known product issues', () => {
    it('[AJX-001] mergeAbortSignal preserves an already-aborted source', () => {
        const aborted = new AbortController()
        const active = new AbortController()
        aborted.abort('already cancelled')

        const merged = mergeAbortSignal(aborted.signal, active.signal)

        expect(merged?.aborted).toBe(true)
        expect(merged?.reason).toBe('already cancelled')
    })

    it('[AJX-001] a request rejects immediately when its input signal is already aborted', async () => {
        const controller = new AbortController()
        controller.abort()
        mockJson({shouldNotBeRequested: true})

        await expect(ajax.get('https://api.example.com/data', {
            signal: controller.signal,
            timeout: 0
        })).rejects.toBeInstanceOf(AbortError)
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('[AJX-001] preserves an existing library AbortError as the cancellation reason', async () => {
        const controller = new AbortController()
        const expected = new AbortError('cancelled upstream', {
            config: {params: new URLSearchParams(), headers: new Headers()} as any
        })
        controller.abort(expected)

        await expect(ajax.get('https://api.example.com/data', {
            signal: controller.signal,
            timeout: 0
        })).rejects.toBe(expected)
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('[AJX-002] an HTTP failure clears its pending timeout timer', async () => {
        vi.useFakeTimers()
        mockJson({error: true}, {status: 500})

        await expect(ajax.get('https://api.example.com/error', {timeout: 1000}))
            .rejects.toBeInstanceOf(NetworkError)

        expect(vi.getTimerCount()).toBe(0)
    })

    it('[AJX-003] missing Content-Length falls back to standard ArrayBuffer parsing', async () => {
        fetchMock.mockImplementationOnce(async () => new Response(new Uint8Array([1, 2, 3])))
        const onDownloadProgress = vi.fn()

        const {result} = await ajax.get('https://api.example.com/file', {
            responseType: 'arrayBuffer',
            onDownloadProgress
        })

        expect(result).toBeInstanceOf(ArrayBuffer)
        expect([...new Uint8Array(result as ArrayBuffer)]).toStrictEqual([1, 2, 3])
        expect(onDownloadProgress).not.toHaveBeenCalled()
    })
})
