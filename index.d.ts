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
        onSuccess?(data: ResponseType<T>): void
        onTimeout?(error: AjaxTimeout): void
        onError?(error: AjaxError<T>): void
        onComplete?(data: ResponseType<T> | undefined, error: AjaxError<T> | undefined): void
        onAbort?(error: AjaxAbort): void
        onUploadProgress?: ProgressCallback
        onDownloadProgress?: ProgressCallback
    }

    /**
     * -------------------------------------------------------------------------
     * 中断
     */

    class AbortToken {
        on(callback: CAjax.Fn): void

        off(callback: CAjax.Fn): void

        abort(): void
    }

    /**
     * -------------------------------------------------------------------------
     * 错误类
     */

    type ErrorCause<T = any> = {[p: Key]: any} & {
        config?: AjaxConfig<T>
        instance?: XMLHttpRequest
    }

    class AjaxError<T = any> extends Error {
        message: string
        cause?: ErrorCause<T>
    }

    class NetworkError<T = any> extends AjaxError<T> {
        type: 'network error'
    }

    class AjaxAbort<T = any> extends AjaxError<T> {
        type: 'abort'
    }

    class AjaxTimeout<T = any> extends AjaxError<T> {
        type: 'timeout'
    }

    /**
     * -------------------------------------------------------------------------
     * Ajax实例
     */

    interface AjaxInstance<T = any> extends Promise<T> {
        abort(): void
    }

    type ResponseType<T = any> = {
        data: T
        config: AjaxConfig<T>
        instance: any
        status: number
        statusText: string
        rawHeaders?: string
        headers: {[p: string]: number | string | string[]}
    }

    type AjaxReturn<T = any> = AjaxInstance<ResponseType<T>>

    type AliasWithoutData = <T = any>(url: string, config?: AjaxConfig<T>) => AjaxReturn<T>

    type AliasWithData = <T = any>(url: string, data: any, config?: AjaxConfig<T>) => AjaxReturn<T>

    const ajax: {
        <T = any>(config?: AjaxConfig<T>): AjaxReturn<T>

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

    class Service {
        constructor(config?: AjaxConfig)

        protected post<T = any>(url: string, data?: any, config?: AjaxConfig<T>): Promise<T>

        protected put<T = any>(url: string, data?: any, config?: AjaxConfig<T>): Promise<T>

        protected patch<T = any>(url: string, data?: any, config?: AjaxConfig<T>): Promise<T>

        protected get<T = any>(url: string, config?: AjaxConfig<T>): Promise<T>

        protected delete<T = any>(url: string, config?: AjaxConfig<T>): Promise<T>

        protected head<T = any>(url: string, config?: AjaxConfig<T>): Promise<T>

        protected options<T = any>(url: string, config?: AjaxConfig<T>): Promise<T>

        protected request<T = any>(method: Method, url: string, data?: any, config?: AjaxConfig<T>): Promise<T>
    }

    type ConfigureDecorator = <T extends typeof Service>(target: T) => T

    function Configure(url: string): ConfigureDecorator
    function Configure(config: AjaxConfig): ConfigureDecorator

    type InterceptorDecorator = (target: Object, propertyKey: Key) => void

    const BeforeRequest: InterceptorDecorator & (() => InterceptorDecorator)

    const BeforeSuccess: InterceptorDecorator & (() => InterceptorDecorator)

    const BeforeFail: InterceptorDecorator & (() => InterceptorDecorator)

    const OnSuccess: InterceptorDecorator & (() => InterceptorDecorator)

    const OnFail: InterceptorDecorator & (() => InterceptorDecorator)

    const OnAbort: InterceptorDecorator & (() => InterceptorDecorator)
}

export = CAjax

export as namespace CAjax