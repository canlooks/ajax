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
    params?: any
    data?: any
    timeout?: number
    abortToken?: AbortToken
    silentAbort?: boolean
    auth?: {
        username: string
        password: string
    }
    responseType?: XMLHttpRequestResponseType | 'stream'
    withCredentials?: boolean
    validateStatus?: ((status: number) => boolean) | null | false
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

export type Cb = (...a: any[]) => any

declare class AbortToken {
    on(callback: Cb): void

    off(callback: Cb): void

    abort(): void
}

declare class AjaxError<T> extends Error {
    message: string
    config: AjaxConfig<T>
    instance?: any
    error?: Error
}

declare class NetworkError<T> extends AjaxError<T> {
    type: 'network error'
}

declare class AjaxAbort extends AjaxError<any> {
    type: 'abort'
}

declare class AjaxTimeout extends AjaxError<any> {
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

declare class HttpService {
    defaultConfig: AjaxConfig

    protected beforeRequest?(config: AjaxConfig): AjaxConfig | Promise<AjaxConfig>

    protected beforeSuccess?(data: any, config: AjaxConfig): any

    protected onSuccess?(data: any, config: AjaxConfig): void

    protected beforeFailed?(error: AjaxError<any>, config: AjaxConfig): any

    protected onFailed?(error: AjaxError<any>, config: AjaxConfig): void

    protected post<T = any>(url: string, data?: any, config?: AjaxConfig<T>): Promise<T>

    protected put<T = any>(url: string, data?: any, config?: AjaxConfig<T>): Promise<T>

    protected patch<T = any>(url: string, data?: any, config?: AjaxConfig<T>): Promise<T>

    protected get<T = any>(url: string, config?: AjaxConfig<T>): Promise<T>

    protected delete<T = any>(url: string, config?: AjaxConfig<T>): Promise<T>

    protected head<T = any>(url: string, config?: AjaxConfig<T>): Promise<T>

    protected options<T = any>(url: string, config?: AjaxConfig<T>): Promise<T>

    protected request<T = any>(method: Method, url: string, data?: any, config?: AjaxConfig<T>): Promise<T>
}

type ServiceDecorator = <T extends typeof HttpService>(target: T) => T

declare function extender(url?: string): ServiceDecorator
declare function extender(config?: AjaxConfig): ServiceDecorator