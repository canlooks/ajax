/**
 * Unit tests for error classes in src/error.ts
 */
import { describe, it, expect } from 'vitest'
import { AjaxError, NetworkError, AbortError, TimeoutError, prefix } from '../../src/error'

const dummyConfig = { params: new URLSearchParams(), headers: new Headers() } as any

describe('Error Classes', () => {
    describe('AjaxError', () => {
        it('should be an instance of Error', () => {
            expect(new AjaxError('test', { config: dummyConfig })).toBeInstanceOf(Error)
        })
        it('should prepend prefix to message', () => {
            const err = new AjaxError('test error', { config: dummyConfig })
            expect(err.message).toContain(prefix)
            expect(err.message).toContain('test error')
        })
        it('should have type "ajaxError"', () => {
            expect(new AjaxError('msg', { config: dummyConfig }).type).toBe('ajaxError')
        })
        it('should store cause with config', () => {
            const err = new AjaxError('msg', { config: dummyConfig })
            expect(err.cause.config).toStrictEqual(dummyConfig)
        })
        it('should have default message', () => {
            const err = new AjaxError(undefined, { config: dummyConfig })
            expect(err.message).toContain('Ajax Error')
        })
    })

    describe('NetworkError', () => {
        it('should extend AjaxError', () => {
            expect(new NetworkError('x', { config: dummyConfig })).toBeInstanceOf(AjaxError)
        })
        it('should have type "networkError"', () => {
            expect(new NetworkError('x', { config: dummyConfig }).type).toBe('networkError')
        })
    })

    describe('AbortError', () => {
        it('should extend AjaxError', () => {
            expect(new AbortError(undefined, { config: dummyConfig })).toBeInstanceOf(AjaxError)
        })
        it('should have type "abortError"', () => {
            expect(new AbortError(undefined, { config: dummyConfig }).type).toBe('abortError')
        })
        it('should have default abort message', () => {
            expect(new AbortError(undefined, { config: dummyConfig }).message).toContain('Request was aborted')
        })
    })

    describe('TimeoutError', () => {
        it('should extend AjaxError', () => {
            expect(new TimeoutError(undefined, { config: dummyConfig })).toBeInstanceOf(AjaxError)
        })
        it('should have type "timeoutError"', () => {
            expect(new TimeoutError(undefined, { config: dummyConfig }).type).toBe('timeoutError')
        })
        it('should have default timeout message', () => {
            expect(new TimeoutError(undefined, { config: dummyConfig }).message).toContain('Request timeout')
        })
    })

    describe('Error type discrimination', () => {
        it('should distinguish all error types', () => {
            const net = new NetworkError('x', { config: dummyConfig })
            const abt = new AbortError(undefined, { config: dummyConfig })
            const tmt = new TimeoutError(undefined, { config: dummyConfig })
            // All extend AjaxError
            for (const e of [net, abt, tmt]) {
                expect(e).toBeInstanceOf(AjaxError)
            }
            // Types are distinct
            expect(net.type).toBe('networkError')
            expect(abt.type).toBe('abortError')
            expect(tmt.type).toBe('timeoutError')
            // instanceof checks specific classes
            expect(abt instanceof NetworkError).toBe(false)
            expect(tmt instanceof AbortError).toBe(false)
        })
    })
})
