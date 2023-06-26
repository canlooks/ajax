export type Method =
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

export type ProgressCallback = (progressEvent: ProgressEvent) => void

export type AjaxConfig<T = any> = {
    url?: string
    method?: Method
    headers?: Record<string, any>
    params?: Record<string | number, any>
    data?: any
    timeout?: number
    abortToken?: AbortToken
    auth?: {
        username: string
        password: string
    }
    responseType?: XMLHttpRequestResponseType | 'stream'
    withCredentials?: boolean
    validateStatus?: ((status: number) => boolean) | boolean
    onSuccess?(data: ResponseType<T>): void
    onTimeout?(error: AjaxTimeout): void
    onError?(error: AjaxError<T>): void
    onComplete?(data: ResponseType<T> | undefined, error: AjaxError<T> | undefined): void
    onAbort?(error: AjaxAbort): void
    onUploadProgress?: ProgressCallback
    onDownloadProgress?: ProgressCallback
    maxRedirects?: number
    maxBodyLength?: number
    maxContentLength?: number
    decompress?: boolean
}

declare class AbortToken {
    on(callback: (...a: any[]) => any): void

    off(callback: (...a: any[]) => any): void

    abort(): void
}

declare class AjaxError<T = any> extends Error {
    message: string
    config: AjaxConfig<T>
    instance?: any
    error?: Error
}

declare class NetworkError<T> extends AjaxError<T> {
    type: 'network error'
}

declare class AjaxAbort extends AjaxError {
    type: 'abort'
}

declare class AjaxTimeout extends AjaxError {
    type: 'timeout'
}

interface AjaxInstance<T> extends Promise<T> {
    abort(): void
}

type ResponseType<T> = {
    data: T
    config: AjaxConfig<T>
    instance: any
    status: number
    statusText: string
    rawHeaders?: string
    headers: Record<string, number | string | string[]>
}

type AdapterReturn<T> = AjaxInstance<ResponseType<T>>

type Adapter = <T = any>(config?: AjaxConfig<T>) => AdapterReturn<T>

type AliasWithoutData = <T = any>(url: string, config?: AjaxConfig<T>) => AdapterReturn<T>

type AliasWithData = <T = any>(url: string, data: any, config?: AjaxConfig<T>) => AdapterReturn<T>

interface Ajax extends Adapter {
    get: AliasWithoutData
    delete: AliasWithoutData
    head: AliasWithoutData
    options: AliasWithoutData

    post: AliasWithData
    put: AliasWithData
    patch: AliasWithData
}

declare const ajax: Ajax

declare function registerAdapter(adapter: (config?: AjaxConfig) => any): void

declare class Service {
    protected post<T = any>(url: string, data?: any, config?: AjaxConfig<T>): Promise<ResponseType<T>>

    protected put<T = any>(url: string, data?: any, config?: AjaxConfig<T>): Promise<ResponseType<T>>

    protected patch<T = any>(url: string, data?: any, config?: AjaxConfig<T>): Promise<ResponseType<T>>

    protected get<T = any>(url: string, config?: AjaxConfig<T>): Promise<ResponseType<T>>

    protected delete<T = any>(url: string, config?: AjaxConfig<T>): Promise<ResponseType<T>>

    protected head<T = any>(url: string, config?: AjaxConfig<T>): Promise<ResponseType<T>>

    protected options<T = any>(url: string, config?: AjaxConfig<T>): Promise<ResponseType<T>>

    protected request<T = any>(method: Method, url: string, data?: any, config?: AjaxConfig<T>): Promise<ResponseType<T>>
}

type SuccessInterceptor<T = void> = (result: any, config: AjaxConfig) => T

type FailInterceptor<T extends AjaxError = AjaxError, R = void> = (error: T, config: AjaxConfig) => R

export type Interceptor = {
    beforeRequest?: (config: AjaxConfig) => AjaxConfig | Promise<AjaxConfig>
    beforeSuccess?: SuccessInterceptor<any>
    beforeFail?: FailInterceptor<AjaxError, any>
    onSuccess?: SuccessInterceptor
    onFail?: FailInterceptor
    onAbort?: FailInterceptor<AjaxAbort>
}

type AssignDecorator = <T extends typeof Service>(target: T) => T

declare function assign(url?: string, interceptor?: Interceptor): AssignDecorator
declare function assign(config?: AjaxConfig, interceptor?: Interceptor): AssignDecorator

declare function assignConfig(...config: (AjaxConfig | undefined)[]): AjaxConfig
declare function assignInterceptor(...interceptors: (Interceptor | Interceptor[] | undefined)[]): Interceptor[]