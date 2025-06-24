import {mergeAbortSignal, Module} from './src'

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

    interface ResolvedConfig extends Omit<AjaxConfig, 'url' | 'params' | 'headers'> {
        url: string
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
        get<T = any>(url: string, config?: AjaxConfig): Promise<T>
        delete<T = any>(url: string, config?: AjaxConfig): Promise<T>
        head<T = any>(url: string, config?: AjaxConfig): Promise<T>
        options<T = any>(url: string, config?: AjaxConfig): Promise<T>
        /** alias with body */
        post<T = any>(url: string, body?: any, config?: AjaxConfig): Promise<T>
        put<T = any>(url: string, body?: any, config?: AjaxConfig): Promise<T>
        patch<T = any>(url: string, body?: any, config?: AjaxConfig): Promise<T>
    }

    type ModuleDecorator = <T extends typeof Service>(target: T) => T

    /** 类修饰器 */
    const Module: ModuleDecorator & ((config?: AjaxConfig) => ModuleDecorator)
    /** 方法修饰器，用于定义拦截器 */
    const BeforeRequest: MethodDecorator & (() => MethodDecorator)
    const BeforeResponse: MethodDecorator & (() => MethodDecorator)

    /**
     * ---------------------------------------------------------------------
     * 工具函数
     */

    function mergeConfig(...config: AjaxConfig[]): ResolvedConfig

    function mergeUrl(prev?: string | URL, next?: string | URL): string | undefined

    function mergeParams(prev: AjaxConfig['params'], next: AjaxConfig['params']): URLSearchParams

    function mergeHeaders(prev?: HeadersInit, next?: HeadersInit): Headers

    function mergeAbortSignal(prev?: AbortSignal | null, next?: AbortSignal | null): AbortSignal | null | undefined
}

export = Ajax