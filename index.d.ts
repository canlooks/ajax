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
        /**
         * 仅支持body中只有一个文件的情况，若同时上传多个文件需手动实现
         */
        onUploadProgress?: ProgressCallback
        onDownloadProgress?: ProgressCallback
    }

    interface NormalizedAjaxConfig extends Omit<AjaxConfig, 'url' | 'params' | 'headers'> {
        url?: URL
        params?: URLSearchParams
        headers?: Headers
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

    type RequestInterceptor = <T extends NormalizedAjaxConfig>(config: T) => T | Promise<T>
    type ResponseInterceptor = (response: any, error: any, config: NormalizedAjaxConfig) => any

    type InterceptorConfig<T> = {
        add(interceptor: T): T
        delete(interceptor: T): void
    }

    type InterceptorsDefinition = {
        requestInterceptors: Set<RequestInterceptor>
        responseInterceptors: Set<ResponseInterceptor>
        beforeRequest: InterceptorConfig<RequestInterceptor>
        beforeResponse: InterceptorConfig<any>
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
}

export = Ajax