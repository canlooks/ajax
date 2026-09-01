import {describe, expect, it} from 'vitest'
import * as publicApi from '../../src'
import {ajax} from '../../src/ajaxInstance'
import {AjaxError} from '../../src/error'
import {Service} from '../../src/module'
import {mergeConfig} from '../../src/utility'
import {mockJson} from '../helpers/fetch'

describe('public source entry point', () => {
    it('exports the documented runtime surface', () => {
        expect(publicApi).toEqual(expect.objectContaining({
            ajax: expect.any(Function),
            core: expect.any(Function),
            AjaxError: expect.any(Function),
            NetworkError: expect.any(Function),
            AbortError: expect.any(Function),
            TimeoutError: expect.any(Function),
            Service: expect.any(Function),
            Config: expect.any(Function),
            RequestInterceptor: expect.any(Function),
            ResponseInterceptor: expect.any(Function),
            bodyTransform: expect.any(Function),
            findBodyBlobs: expect.any(Function),
            mergeConfig: expect.any(Function),
            mergeUrl: expect.any(Function),
            mergeParams: expect.any(Function),
            mergeHeaders: expect.any(Function),
            mergeAbortSignal: expect.any(Function),
            createAbortSignalScope: expect.any(Function),
            mergeAbortSignalScope: expect.any(Function),
            mergeConfigScope: expect.any(Function),
            catchCommonError: expect.any(Function)
        }))
        expect(publicApi).not.toHaveProperty('default')
    })

    it('re-exports the same singleton and class/function identities', () => {
        expect(publicApi.ajax).toBe(ajax)
        expect(publicApi.AjaxError).toBe(AjaxError)
        expect(publicApi.Service).toBe(Service)
        expect(publicApi.mergeConfig).toBe(mergeConfig)
    })

    it('exposes disposable signal and config scopes through the public entry point', () => {
        const first = new AbortController()
        const second = new AbortController()
        const signalScope = publicApi.mergeAbortSignalScope(first.signal, second.signal)
        const configScope = publicApi.mergeConfigScope(
            {signal: first.signal},
            {signal: second.signal}
        )

        expect(signalScope.signal).toBeInstanceOf(AbortSignal)
        expect(signalScope.cleanup).toEqual(expect.any(Function))
        expect(configScope.config.signal).toBeInstanceOf(AbortSignal)
        expect(configScope.cleanup).toEqual(expect.any(Function))
        signalScope.cleanup()
        configScope.cleanup()
    })

    it('supports a request using only the public entry point', async () => {
        mockJson({public: true})
        const response = await publicApi.ajax.get<{public: boolean}>('https://api.example.com/public', {
            timeout: 0
        })

        expect(response.result.public).toBe(true)
    })
})
