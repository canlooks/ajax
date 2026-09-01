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

export type ProgressEvent = {
    loaded: number
    total: number
    chunk: Uint8Array
}

export type ProgressCallback = (progressEvent: ProgressEvent) => void

export interface AjaxConfig extends RequestInit {
    method?: Method
    url?: string | URL
    params?: string[][] | Record<string, string> | string | URLSearchParams
    /** 默认 60 秒；0 表示无超时。 */
    timeout?: number
    /**
     * 自动转换响应；none 表示不执行标准响应转换。
     * 指定 onDownloadProgress 时默认为 none，否则默认为 json。
     */
    responseType?: 'arrayBuffer' | 'blob' | 'formData' | 'json' | 'text' | 'none'
    onUploadProgress?: ProgressCallback
    onDownloadProgress?: ProgressCallback
    onRequest?: RequestInterceptorType
    onResponse?: ResponseInterceptorType
}

export interface ResolvedConfig extends Omit<AjaxConfig, 'url' | 'params' | 'headers'> {
    url?: string
    params: URLSearchParams
    headers: Headers
}

export type AbortSignalScope = {
    signal: AbortSignal | null | undefined
    /** 幂等地释放组合 signal 在源 signal 上注册的监听器。 */
    cleanup(): void
}

export type ConfigScope = {
    config: ResolvedConfig
    /** 幂等地释放 config.signal 的组合监听器。 */
    cleanup(): void
}

export type AjaxResponse<T> = {
    result: T
    response: Response
    config: ResolvedConfig
}

export type AjaxReturn<T> = Promise<AjaxResponse<T>>

export type AliasWithoutBody = <T>(url: string, config?: AjaxConfig) => AjaxReturn<T>

export type AliasWithBody = <T>(url: string, data: any, config?: AjaxConfig) => AjaxReturn<T>

export type AjaxAlias = {
    get: AliasWithoutBody
    delete: AliasWithoutBody
    head: AliasWithoutBody
    options: AliasWithoutBody
    post: AliasWithBody
    put: AliasWithBody
    patch: AliasWithBody
}

export type RequestInterceptorType = <T extends ResolvedConfig>(config: T) => T | Promise<T>

export type ResponseInterceptorType = (response: any, error: any, config: ResolvedConfig) => any

export type InterceptorsDefinition = {
    requestInterceptor: Set<RequestInterceptorType>
    responseInterceptor: Set<ResponseInterceptorType>
}

export interface Ajax extends AjaxAlias, InterceptorsDefinition {
    <T = any>(config?: AjaxConfig): AjaxReturn<T>
    config: AjaxConfig
    create(config?: AjaxConfig): Ajax
}

export type AjaxErrorCause = {
    config: ResolvedConfig
    response?: Response
    /** 原始取消原因；仅在外部 AbortSignal 触发取消时存在。 */
    reason?: unknown
}

export type InterceptorDecorator = (
    target: Object,
    propertyKey: PropertyKey,
    descriptor: PropertyDescriptor
) => void
