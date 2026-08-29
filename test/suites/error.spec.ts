import {afterEach, describe, expect, it, vi} from 'vitest'
import {AbortError, AjaxError, NetworkError, TimeoutError, prefix} from '../../src/error'

const config = {
    url: 'https://api.example.com/data',
    params: new URLSearchParams(),
    headers: new Headers()
} as any

afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
})

describe('AjaxError hierarchy', () => {
    it('extends Error, prefixes the message and stores native cause', () => {
        const cause = {config}
        const error = new AjaxError('parse failed', cause)

        expect(error).toBeInstanceOf(Error)
        expect(error).toBeInstanceOf(AjaxError)
        expect(error.message).toBe(`${prefix}parse failed`)
        expect(error.cause).toBe(cause)
        expect(error.type).toBe('ajaxError')
        expect(error.stack).toContain(`${prefix}parse failed`)
    })

    it('uses the Ajax Error default message only when message is undefined', () => {
        expect(new AjaxError(undefined, {config}).message).toBe(`${prefix}Ajax Error`)
        expect(new AjaxError('', {config}).message).toBe(prefix)
    })

    it('can retain a native Response in its cause', () => {
        const response = new Response('failure', {status: 500})
        const error = new AjaxError('failed', {config, response})

        expect(error.cause.response).toBe(response)
        expect(error.cause.response?.status).toBe(500)
    })

    it.each([
        [NetworkError, 'networkError', 'Network Error'],
        [AbortError, 'abortError', 'Request was aborted'],
        [TimeoutError, 'timeoutError', 'Request timeout']
    ] as const)('%s extends AjaxError with type %s and its default message', (ErrorClass, type, message) => {
        const error = new ErrorClass(undefined, {config})

        expect(error).toBeInstanceOf(AjaxError)
        expect(error).toBeInstanceOf(ErrorClass)
        expect(error.type).toBe(type)
        expect(error.message).toBe(`${prefix}${message}`)
        expect(error.cause.config).toBe(config)
    })

    it('preserves custom messages in every specialized error', () => {
        expect(new NetworkError('offline', {config}).message).toBe(`${prefix}offline`)
        expect(new AbortError('cancelled by user', {config}).message).toBe(`${prefix}cancelled by user`)
        expect(new TimeoutError('deadline exceeded', {config}).message).toBe(`${prefix}deadline exceeded`)
    })

    it('supports reliable instanceof and type discrimination', () => {
        const network = new NetworkError(undefined, {config})
        const abort = new AbortError(undefined, {config})
        const timeout = new TimeoutError(undefined, {config})

        expect(network).not.toBeInstanceOf(AbortError)
        expect(abort).not.toBeInstanceOf(TimeoutError)
        expect(timeout).not.toBeInstanceOf(NetworkError)
        expect(new Set([network.type, abort.type, timeout.type]).size).toBe(3)
    })
})

describe('debug mode', () => {
    it('logs the resolved config when CANLOOKS_AJAX_DEBUG is on', async () => {
        vi.stubEnv('CANLOOKS_AJAX_DEBUG', 'on')
        vi.resetModules()
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const module = await import('../../src/error')

        new module.AjaxError('debug', {config})

        expect(module.debug).toBe(true)
        expect(consoleError).toHaveBeenCalledOnce()
        expect(consoleError).toHaveBeenCalledWith(
            '[@canlooks/ajax] Input Config: ',
            JSON.stringify(config, null, 2)
        )
    })

    it('does not log config when debug mode is not exactly on', async () => {
        vi.stubEnv('CANLOOKS_AJAX_DEBUG', 'off')
        vi.resetModules()
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const module = await import('../../src/error')

        new module.AjaxError('quiet', {config})

        expect(module.debug).toBe(false)
        expect(consoleError).not.toHaveBeenCalled()
    })
})
