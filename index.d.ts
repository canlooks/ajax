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
         * 自动将`response`对象进行转换，若设为`none`，则不会转换，{@link AjaxResponse}中的`result`将为`undefined`.
         * 若设置了{@link onDownloadProgress}，默认为`none`，否则默认为`json`
         */
        responseType?: 'arrayBuffer' | 'blob' | 'formData' | 'json' | 'text' | 'none'
        onUploadProgress?: ProgressCallback
        onDownloadProgress?: ProgressCallback
        onRequest?: RequestInterceptorType
        onResponse?: ResponseInterceptorType
    }

    interface ResolvedConfig extends Omit<AjaxConfig, 'url' | 'params' | 'headers'> {
        url?: string
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
    }

    type RequestInterceptorType = <T extends ResolvedConfig>(config: T) => T | Promise<T>
    type ResponseInterceptorType = (response: any, error: any, config: ResolvedConfig) => any

    type InterceptorsDefinition = {
        requestInterceptor: Set<RequestInterceptorType>
        responseInterceptor: Set<ResponseInterceptorType>
    }

    interface Ajax extends AjaxAlias, InterceptorsDefinition {
        <T = any>(config?: AjaxConfig): AjaxReturn<T>
        config: AjaxConfig
        create(config?: AjaxConfig): Ajax
    }

    const ajax: Ajax

    /**
     * ---------------------------------------------------------------------
     * 响应
     */

    type AjaxResponse<T> = {
        result: T
        response: Response
        config: ResolvedConfig
    }

    /**
     * ---------------------------------------------------------------------
     * 错误
     */

    type AjaxErrorCause = {
        config: ResolvedConfig
        response?: Response
    }

    class AjaxError extends Error {
        type: 'ajaxError' | 'networkError' | 'abortError' | 'timeoutError'
        cause: AjaxErrorCause
    }

    class NetworkError extends AjaxError {
        cause: AjaxErrorCause
    }

    class AbortError extends AjaxError {
        cause: AjaxErrorCause
    }

    class TimeoutError extends AjaxError {
        cause: AjaxErrorCause
    }

    /**
     * ---------------------------------------------------------------------
     * 模块化
     */

    class Service {
        /** ajax方法实例 */
        static ajax: Ajax
        /** 当前的局部配置 */
        static config: AjaxConfig
        /** 与父类的配置合并后的完整配置 */
        static resolvedConfig: ResolvedConfig

        /** alias without body */
        static get<T = any>(url: string, config?: AjaxConfig): Promise<T>
        static delete<T = any>(url: string, config?: AjaxConfig): Promise<T>
        static head<T = any>(url: string, config?: AjaxConfig): Promise<T>
        static options<T = any>(url: string, config?: AjaxConfig): Promise<T>

        /** alias with body */
        static post<T = any>(url: string, body?: any, config?: AjaxConfig): Promise<T>
        static put<T = any>(url: string, body?: any, config?: AjaxConfig): Promise<T>
        static patch<T = any>(url: string, body?: any, config?: AjaxConfig): Promise<T>
    }

    /**
     * 类修饰器，继承{@link Service}的类使用该修饰器可以扩展`config`
     * @param config ajax配置
     */
    function Config(config: AjaxConfig): <T extends typeof Service>(target: T) => void

    type InterceptorDecorator = (target: Object, propertyKey: PropertyKey, descriptor: PropertyDescriptor) => void

    /**
     * 方法修饰器，定义请求拦截器
     */
    const RequestInterceptor: MethodDecorator & (() => MethodDecorator)

    /**
     * 方法修饰器，定义响应拦截器
     */
    const ResponseInterceptor: MethodDecorator & (() => MethodDecorator)

    /**
     * ---------------------------------------------------------------------
     * 内部工具函数
     */

    function findBodyBlobs(body: any): Promise<Blob[]>

    function mergeConfig(...config: AjaxConfig[]): ResolvedConfig

    function mergeUrl(prev?: string | URL, next?: string | URL): string | undefined

    function mergeParams(prev: AjaxConfig['params'], next: AjaxConfig['params']): URLSearchParams

    function mergeHeaders(prev?: HeadersInit, next?: HeadersInit): Headers

    function mergeAbortSignal(prev?: AbortSignal | null, next?: AbortSignal | null): AbortSignal | null | undefined

    function catchCommonError(e: any, newError: (message?: string) => any): any
}

export = Ajax