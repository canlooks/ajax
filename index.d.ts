declare namespace CAjax {
    type Key = string | number | symbol
    type Fn = (...args: any[]) => any

    /**
     * -------------------------------------------------------------------------
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

    type ProgressCallback = (progressEvent: ProgressEvent) => void

    type AjaxConfig<T = any> = {
        url?: string
        method?: Method
        headers?: {[p: string]: any}
        params?: {[p: string | number]: any}
        data?: any
        timeout?: number
        abortToken?: AbortToken
        auth?: {
            username: string
            password: string
        }
        responseType?: XMLHttpRequestResponseType
        withCredentials?: boolean
        validateStatus?: ((status: number) => boolean) | boolean
        onSuccess?(data: ResponseBody<T>): void
        onTimeout?(error: TimeoutError): void
        onError?(error: AjaxError): void
        onComplete?(data: ResponseBody<T> | null, error: AjaxError | null): void
        onAbort?(error: AbortError): void
        onUploadProgress?: ProgressCallback
        onDownloadProgress?: ProgressCallback
    }

    /**
     * -------------------------------------------------------------------------
     * 中断
     */

    class AbortToken {
        on(callback: Fn): void

        off(callback: Fn): void

        abort(): void
    }

    /**
     * -------------------------------------------------------------------------
     * 错误类
     */

    type AjaxErrorCause<T> = {
        config?: AjaxConfig<T>
        target?: any
        propertyKey?: Key
        error?: any
        [p: string]: any
    }

    class AjaxError extends Error {
        type: string
    }

    class NetworkError extends AjaxError {}

    class AbortError extends AjaxError {}

    class TimeoutError extends AjaxError {}

    /**
     * -------------------------------------------------------------------------
     * Ajax实例
     */

    interface AjaxInstance<T> extends Promise<T> {
        instance: XMLHttpRequest
        abort(): void
    }

    type ResponseBody<T = any> = {
        result: T
        config: AjaxConfig<T>
        instance: XMLHttpRequest
        status: number
        statusText: string
        rawHeaders?: string
        headers: {[p: string]: number | string | string[]}
    }

    type AjaxReturn<T> = AjaxInstance<ResponseBody<T>>

    type AliasWithoutData = <T>(url: string, config?: AjaxConfig<T>) => AjaxReturn<T>

    type AliasWithData = <T>(url: string, data: any, config?: AjaxConfig<T>) => AjaxReturn<T>

    const ajax: {
        <T>(config?: AjaxConfig<T>): AjaxReturn<T>

        get: AliasWithoutData
        delete: AliasWithoutData
        head: AliasWithoutData
        options: AliasWithoutData

        post: AliasWithData
        put: AliasWithData
        patch: AliasWithData
    }

    /**
     * -------------------------------------------------------------------------
     * 模块化
     */

    function registerAdapter(adapter: (config?: AjaxConfig) => any): void

    type RequestInterceptor = (config: AjaxConfig) => AjaxConfig | Promise<AjaxConfig>

    type ResponseInterceptor = (response: any, error: any, config: AjaxConfig) => any

    class Service {
        constructor(config?: AjaxConfig)

        config: AjaxConfig

        post<T = any>(url: string, data?: any, config?: AjaxConfig): Promise<T>

        put<T = any>(url: string, data?: any, config?: AjaxConfig): Promise<T>

        patch<T = any>(url: string, data?: any, config?: AjaxConfig): Promise<T>

        get<T = any>(url: string, config?: AjaxConfig): Promise<T>

        delete<T = any>(url: string, config?: AjaxConfig): Promise<T>

        head<T = any>(url: string, config?: AjaxConfig): Promise<T>

        options<T = any>(url: string, config?: AjaxConfig): Promise<T>

        request<T = any>(method: Method, url: string, data?: any, config?: AjaxConfig): Promise<T>
    }

    /**
     * -------------------------------------------------------------------------
     * 类修饰器
     */

    type ServiceDecorator = (target: typeof Service) => void

    function Configure(url: string): ServiceDecorator
    function Configure(config: AjaxConfig): ServiceDecorator

    /**
     * 追加请求拦截器
     * @param filter 
     */
    function BeforeRequest(filter: RequestInterceptor): ServiceDecorator

    /**
     * 追加响应拦截器
     * @param filter 
     */
    function BeforeResponse(filter: ResponseInterceptor): ServiceDecorator

    /**
     * -------------------------------------------------------------------------
     * 方法修饰器
     */

    type CallbackDecorator = (target: typeof Service, propertyKey: Key, descriptor: TypedPropertyDescriptor<Fn>) => void

    const onSuccess: CallbackDecorator & (() => CallbackDecorator)

    const onFailed: CallbackDecorator & (() => CallbackDecorator)

    const onComplete: CallbackDecorator & (() => CallbackDecorator)
}

export = CAjax

export as namespace CAjax