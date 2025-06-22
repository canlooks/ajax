import {Module} from './src'

declare namespace Ajax {
    /**
     * ---------------------------------------------------------------------
     * 配置项
     */

    type Method =
        'get' | 'GET' |
        'delete' | 'DELETE' |
        'head' | 'HEAD' |
        'options' | 'OPTIONS' |
        'post' | 'POST' |
        'put' | 'PUT' |
        'patch' | 'PATCH' |
        'purge' | 'PURGE' |
        'link' | 'LINK' |
        'unlink' | 'UNLINK'

    type ProgressEvent = {
        loaded: number
        total: number
        chunk: Uint8Array
    }

    type ProgressCallback = (progressEvent: ProgressEvent) => void

    interface AjaxConfig extends RequestInit {
        method?: Method
        url?: string | URL
        params?: string[][] | Record<string, string> | string | URLSearchParams
        /** 默认`60秒`; `0`表示无超时 */
        timeout?: number
        /**
         * 若设置了{@link onDownloadProgress}，默认为`undefined`，否则默认为`json`
         */
        responseType?: 'arrayBuffer' | 'blob' | 'formData' | 'json' | 'text'
        onUploadProgress?: ProgressCallback
        onDownloadProgress?: ProgressCallback
        onRequest?: RequestInterceptor
        onResponse?: ResponseInterceptor
    }

    interface ResolvedConfig extends Omit<AjaxConfig, 'params' | 'headers'> {
        params: URLSearchParams
        headers: Headers
    }

    /**
     * ---------------------------------------------------------------------
     * Ajax方法，alias与instance
     */

    type AjaxReturn<T> = Promise<AjaxResponse<T>>

    type AliasWithoutBody = <T>(url: string, config?: AjaxConfig) => AjaxReturn<T>

    type AliasWithBody = <T>(url: string, data: any, config?: AjaxConfig) => AjaxReturn<T>

    type AjaxAlias = {
        /** alias without body */
        get: AliasWithoutBody
        delete: AliasWithoutBody
        head: AliasWithoutBody
        options: AliasWithoutBody
        /** alias with body */
        post: AliasWithBody
        put: AliasWithBody
        patch: AliasWithBody
        /** interceptor */
    }

    type RequestInterceptor = <T extends ResolvedConfig>(config: T) => T | Promise<T>
    type ResponseInterceptor = (response: any, error: any, config: ResolvedConfig) => any

    type InterceptorsDefinition = {
        beforeRequest: Set<RequestInterceptor>
        beforeResponse: Set<ResponseInterceptor>
    }

    interface Ajax extends AjaxAlias, InterceptorsDefinition {
        <T = any>(config?: AjaxConfig): AjaxReturn<T>
        config: AjaxConfig
        extend(config?: AjaxConfig): Ajax
    }

    const ajax: Ajax

    /**
     * ---------------------------------------------------------------------
     * 响应
     */

    type AjaxResponse<T> = {
        result: T
        response: Response
        config: AjaxConfig
    }

    /**
     * ---------------------------------------------------------------------
     * 错误
     */

    class AjaxError extends Error {
        type: 'ajaxError' | 'networkError' | 'abortError' | 'timeoutError'
    }

    class NetworkError extends AjaxError {}

    class AbortError extends AjaxError {}

    class TimeoutError extends AjaxError {}

    /**
     * ---------------------------------------------------------------------
     * 模块化
     */

    class Service {
        ajax: Ajax
        constructor(public config?: AjaxConfig)
        /** alias without body */
        get(url: string, config?: AjaxConfig): Promise<any>
        delete(url: string, config?: AjaxConfig): Promise<any>
        head(url: string, config?: AjaxConfig): Promise<any>
        options(url: string, config?: AjaxConfig): Promise<any>
        /** alias with body */
        post(url: string, body: any, config?: AjaxConfig): Promise<any>
        put(url: string, body: any, config?: AjaxConfig): Promise<any>
        patch(url: string, body: any, config?: AjaxConfig): Promise<any>
    }

    type ModuleDecorator = <T extends typeof Service>(target: T) => T

    /** 类修饰器 */
    const Module: ModuleDecorator & ((config?: AjaxConfig) => ModuleDecorator)
    /** 方法修饰器，用于定义拦截器 */
    const BeforeRequest: MethodDecorator & (() => MethodDecorator)
    const BeforeResponse: MethodDecorator & (() => MethodDecorator)
}

export = Ajax