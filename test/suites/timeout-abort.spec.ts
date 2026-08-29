import {describe, expect, it, vi} from 'vitest'
import {ajax} from '../../src/ajaxInstance'
import {AbortError, AjaxError, NetworkError, TimeoutError} from '../../src/error'
import {fetchInit, mockJson, mockPendingUntilAbort} from '../helpers/fetch'

describe('timeout and cancellation', () => {
    it('creates and clears the default 60-second timeout for a normal request', async () => {
        vi.useFakeTimers()
        mockJson({ok: true})

        await ajax.get('https://api.example.com/data')

        expect(fetchInit().signal).toBeInstanceOf(AbortSignal)
        expect(vi.getTimerCount()).toBe(0)
    })

    it('does not create an internal signal when timeout is zero', async () => {
        vi.useFakeTimers()
        mockJson({ok: true})

        await ajax.get('https://api.example.com/data', {timeout: 0})

        expect(fetchInit().signal).toBeUndefined()
        expect(vi.getTimerCount()).toBe(0)
    })

    it('clears the timeout when fetch rejects', async () => {
        vi.useFakeTimers()
        fetchMock.mockRejectedValueOnce(new TypeError('offline'))

        await expect(ajax.get('https://api.example.com/data', {timeout: 1000}))
            .rejects.toBeInstanceOf(NetworkError)

        expect(vi.getTimerCount()).toBe(0)
    })

    it('clears the timeout when response parsing rejects', async () => {
        vi.useFakeTimers()
        fetchMock.mockImplementationOnce(async () => new Response('{invalid json'))

        await expect(ajax.get('https://api.example.com/data', {timeout: 1000}))
            .rejects.toBeInstanceOf(AjaxError)

        expect(vi.getTimerCount()).toBe(0)
    })

    it('aborts a pending request with TimeoutError at the configured deadline', async () => {
        vi.useFakeTimers()
        mockPendingUntilAbort()
        const request = ajax.get('https://api.example.com/slow', {timeout: 25})
        const rejection = expect(request).rejects.toMatchObject({
            type: 'timeoutError',
            message: expect.stringContaining('Request timeout'),
            cause: {config: expect.objectContaining({timeout: 25})}
        })

        await vi.advanceTimersByTimeAsync(24)
        expect(fetchInit().signal?.aborted).toBe(false)
        await vi.advanceTimersByTimeAsync(1)
        await rejection
        expect(fetchInit().signal?.reason).toBeInstanceOf(TimeoutError)
    })

    it('maps cancellation from an external signal to AbortError', async () => {
        const controller = new AbortController()
        const removeListener = vi.spyOn(controller.signal, 'removeEventListener')
        mockPendingUntilAbort()
        const request = ajax.get('https://api.example.com/data', {
            signal: controller.signal,
            timeout: 0
        })
        const rejection = expect(request).rejects.toBeInstanceOf(AbortError)
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())

        const callerReason = new Error('caller reason')
        controller.abort(callerReason)

        await rejection
        expect(fetchInit().signal?.aborted).toBe(true)
        expect(fetchInit().signal?.reason).toBeInstanceOf(AbortError)
        expect((fetchInit().signal?.reason as AbortError).cause.reason).toBe(callerReason)
        expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function))
    })

    it('uses AbortError when external cancellation wins over the timeout', async () => {
        vi.useFakeTimers()
        const controller = new AbortController()
        mockPendingUntilAbort()
        const request = ajax.get('https://api.example.com/data', {
            signal: controller.signal,
            timeout: 100
        })
        const rejection = expect(request).rejects.toBeInstanceOf(AbortError)
        await vi.advanceTimersByTimeAsync(10)

        controller.abort()

        await rejection
        expect(fetchInit().signal?.reason).toBeInstanceOf(AbortError)
    })

    it('uses TimeoutError when the timeout wins over external cancellation', async () => {
        vi.useFakeTimers()
        const controller = new AbortController()
        mockPendingUntilAbort()
        const request = ajax.get('https://api.example.com/data', {
            signal: controller.signal,
            timeout: 20
        })
        const rejection = expect(request).rejects.toBeInstanceOf(TimeoutError)

        await vi.advanceTimersByTimeAsync(20)
        await rejection
        controller.abort()

        expect(fetchInit().signal?.reason).toBeInstanceOf(TimeoutError)
    })

    it('wraps an unrelated AbortError-style fetch rejection as NetworkError', async () => {
        fetchMock.mockRejectedValueOnce(new DOMException('The operation was aborted', 'AbortError'))

        await expect(ajax.get('https://api.example.com/data', {timeout: 0}))
            .rejects.toBeInstanceOf(NetworkError)
    })
})
