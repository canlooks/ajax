import {core} from './core.js'
import type {
    Ajax,
    AjaxConfig,
    Method,
    RequestInterceptorType,
    ResolvedConfig,
    ResponseInterceptorType
} from './types.js'
import {createAbortSignalScope} from './abortSignal.js'
import {
    createInstanceDefaults,
    resolveRequestConfig,
    type InstanceDefaults
} from './config.js'

export const ajax = createInstance()

function createInstance(
    defaults: InstanceDefaults = {config: {}, signals: []},
    requestInterceptor = new Set<RequestInterceptorType>(),
    responseInterceptor = new Set<ResponseInterceptorType>()
) {
    const ajaxInstance = (async (requestConfig: AjaxConfig = {}) => {
        const requestDefaults = resolveRequestConfig(defaults, requestConfig)
        const signalScope = createAbortSignalScope(...requestDefaults.signals)
        let config: ResolvedConfig = {
            ...requestDefaults.config,
            signal: signalScope.signal
        }

        try {
            config = await enforceRequestInterceptors(config)
            let res
            try {
                res = await core(config)
            } catch (e) {
                return await enforceResponseInterceptors(null, e, config, false)
            }
            const returnValue = await enforceResponseInterceptors(res, null, config, true)
            return typeof returnValue === 'undefined' ? res : returnValue
        } finally {
            signalScope.cleanup()
        }
    }) as Ajax

    ajaxInstance.config = defaults.config

    /**
     * ------------------------------------------------------------------
     * interceptors
     */

    ajaxInstance.requestInterceptor = requestInterceptor
    ajaxInstance.responseInterceptor = responseInterceptor

    /**
     * ------------------------------------------------------------------
     * sub instance
     */

    ajaxInstance.create = (config?: AjaxConfig) => createInstance(
        createInstanceDefaults(defaults, config),
        new Set(requestInterceptor),
        new Set(responseInterceptor)
    )

    /**
     * ------------------------------------------------------------------
     * alias
     */

    const aliasWithoutBody = (method: Method) => {
        return (url: string, config?: AjaxConfig) => ajaxInstance({...config, method, url})
    }

    ajaxInstance.get = aliasWithoutBody('GET')
    ajaxInstance.delete = aliasWithoutBody('DELETE')
    ajaxInstance.head = aliasWithoutBody('HEAD')
    ajaxInstance.options = aliasWithoutBody('OPTIONS')

    const aliasWithBody = (method: Method) => {
        return (url: string, body: any, config?: AjaxConfig) => ajaxInstance({...config, method, url, body})
    }

    ajaxInstance.post = aliasWithBody('POST')
    ajaxInstance.put = aliasWithBody('PUT')
    ajaxInstance.patch = aliasWithBody('PATCH')

    return ajaxInstance

    /**
     * 执行请求拦截器
     * @param config
     */
    async function enforceRequestInterceptors<T extends ResolvedConfig>(config: T): Promise<T> {
        const set = new Set(requestInterceptor)
        config.onRequest && set.add(config.onRequest)
        for (const interceptor of set) {
            const newConfig = await interceptor(config)
            if (typeof newConfig === 'object' && newConfig) {
                config = newConfig
            }
        }
        return config
    }

    /**
     * 执行响应拦截器
     * @param response
     * @param error
     * @param config
     * @param isFinalSuccess
     */
    async function enforceResponseInterceptors(response: any, error: any, config: ResolvedConfig, isFinalSuccess: boolean) {
        const set = new Set(responseInterceptor)
        config.onResponse && set.add(config.onResponse)
        for (const interceptor of set) {
            try {
                const returnValue = await interceptor(response, error, config)
                if (typeof returnValue !== 'undefined') {
                    response = returnValue
                }
                error = null
                isFinalSuccess = true
            } catch (e) {
                error = e
                isFinalSuccess = false
            }
        }
        if (isFinalSuccess) {
            return response
        }
        throw error
    }
}
