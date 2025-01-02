import {core} from './core'
import {Ajax, AjaxConfig, ResolvedConfig, Method, RequestInterceptor, ResponseInterceptor} from '../index'
import {mergeConfig} from './util'

export const ajax = createInstance()

function createInstance(parentConfig: AjaxConfig = {}) {
    const ajaxInstance = (async (config: AjaxConfig) => {
        config = await enforceRequestInterceptors(mergeConfig(parentConfig, config))
        let res
        try {
            res = await core(config)
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

    const beforeRequest = ajaxInstance.beforeRequest = new Set<RequestInterceptor>()
    const beforeResponse = ajaxInstance.beforeResponse = new Set<ResponseInterceptor>()

    /**
     * ------------------------------------------------------------------
     * sub instance
     */

    ajaxInstance.extend = (config?: AjaxConfig) => createInstance(config
        ? mergeConfig(parentConfig, config)
        : parentConfig
    )

    /**
     * ------------------------------------------------------------------
     * alias
     */

    const aliasWithoutBody = (method: Method) => {
        return (url: string, config?: AjaxConfig) => ajaxInstance({...config, method, url})
    }

    ajaxInstance.get = aliasWithoutBody('get')
    ajaxInstance.delete = aliasWithoutBody('delete')
    ajaxInstance.head = aliasWithoutBody('head')
    ajaxInstance.options = aliasWithoutBody('options')

    const aliasWithBody = (method: Method) => {
        return (url: string, body: any, config?: AjaxConfig) => ajaxInstance({...config, method, url, body})
    }

    ajaxInstance.post = aliasWithBody('post')
    ajaxInstance.put = aliasWithBody('put')
    ajaxInstance.patch = aliasWithBody('patch')

    return ajaxInstance

    /**
     * 执行请求拦截器
     * @param config
     */
    async function enforceRequestInterceptors<T extends ResolvedConfig>(config: T): Promise<T> {
        for (const interceptor of beforeRequest) {
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
        for (const interceptor of beforeResponse) {
            try {
                const returnValue = await interceptor(response, error, config)
                if (typeof returnValue !== 'undefined') {
                    response = returnValue
                }
                error = null
                isFinalSuccess = true
            } catch (e) {
                response = null
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