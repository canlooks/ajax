import {core} from './core.js'
import type {
    Ajax,
    AjaxConfig,
    Method,
    RequestInterceptorType,
    ResolvedConfig,
    ResponseInterceptorType
} from './types.js'
import {mergeConfig} from './utility.js'

export const ajax = createInstance()

function createInstance(
    parentConfig: AjaxConfig = {},
    requestInterceptor = new Set<RequestInterceptorType>(),
    responseInterceptor = new Set<ResponseInterceptorType>()
) {
    const ajaxInstance = (async (config: AjaxConfig) => {
        config = await enforceRequestInterceptors(mergeConfig(parentConfig, config))
        let res
        try {
            res = await core(config as ResolvedConfig)
        } catch (e) {
            return await enforceResponseInterceptors(null, e, config as ResolvedConfig, false)
        }
        const returnValue = await enforceResponseInterceptors(res, null, config as ResolvedConfig, true)
        return typeof returnValue === 'undefined' ? res : returnValue
    }) as Ajax

    ajaxInstance.config = parentConfig

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
        mergeConfig(parentConfig, config),
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
