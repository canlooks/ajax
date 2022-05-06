import {ajax} from './adapter'
import {AjaxConfig, Method, ResponseType} from '../index'
import {AjaxError} from './error'

let customAdapter = ajax

export function registerAdapter(adapter: (config?: AjaxConfig<any>) => any) {
    customAdapter = adapter
}

export class HttpService {
    defaultConfig: AjaxConfig<any> = {}

    protected beforeRequest?(config: AjaxConfig<any>): AjaxConfig<any> | Promise<AjaxConfig<any>>

    protected beforeSuccess?(data: any, config: AjaxConfig<any>): any

    protected onSuccess?(data: any, config: AjaxConfig<any>): void

    protected beforeFailed?(error: AjaxError<any>, config: AjaxConfig<any>): any

    protected onFailed?(error: AjaxError<any>, config: AjaxConfig<any>): void

    protected post<T = any>(url: string, data?: any, config?: AjaxConfig<T>): Promise<ResponseType<T>> {
        return this.request('post', url, data, config)
    }

    protected put<T = any>(url: string, data?: any, config?: AjaxConfig<T>): Promise<ResponseType<T>> {
        return this.request('put', url, data, config)
    }

    protected patch<T = any>(url: string, data?: any, config?: AjaxConfig<T>): Promise<ResponseType<T>> {
        return this.request('patch', url, data, config)
    }

    protected get<T = any>(url: string, config?: AjaxConfig<T>): Promise<ResponseType<T>> {
        return this.request('get', url, void 0, config)
    }

    protected delete<T = any>(url: string, config?: AjaxConfig<T>): Promise<ResponseType<T>> {
        return this.request('delete', url, void 0, config)
    }

    protected head<T = any>(url: string, config?: AjaxConfig<T>): Promise<ResponseType<T>> {
        return this.request('head', url, void 0, config)
    }

    protected options<T = any>(url: string, config?: AjaxConfig<T>): Promise<ResponseType<T>> {
        return this.request('options', url, void 0, config)
    }

    protected async request<T>(method: Method, url: string, data?: any, config?: AjaxConfig<T>) {
        let mergedConfig = mergeConfig(this.defaultConfig, config, {method, url, data})
        mergedConfig = await this.beforeRequest?.(mergedConfig) || mergedConfig
        return await intercept(this, () => customAdapter(mergedConfig), {
            beforeSuccess: this.beforeSuccess,
            onSuccess: this.onSuccess,
            beforeFailed: this.beforeFailed,
            onFailed: this.onFailed,
        }, mergedConfig)
    }
}

function mergeConfig(...config: (AjaxConfig<any> | undefined)[]) {
    let ret = config[0] || {}
    for (let i = 1, {length} = config; i < length; i++) {
        let next = config[i]
        if (!next) continue
        let url = combineUrl(ret.url, next.url)
        let headers = {...ret.headers, ...next.headers}
        ret = {...ret, ...next, url, headers}
    }
    return ret
}

function combineUrl(baseURL = '', relativeURL?: string) {
    if (!relativeURL) {
        return baseURL
    }
    if (/^([a-zA-Z]+:)?\/\//.test(relativeURL)) {
        return relativeURL
    }
    return baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
}

type Interceptor = (a: any, config: AjaxConfig<any>) => any

async function intercept<T>(ctx: HttpService, mainFn: (...a: any[]) => any, interceptors: {
    beforeSuccess?: Interceptor
    onSuccess?: Interceptor
    beforeFailed?: Interceptor
    onFailed?: Interceptor
} = {}, config: AjaxConfig<T>): Promise<any> {
    let res
    try {
        res = await mainFn()
        if (interceptors.beforeSuccess) {
            res = await interceptors.beforeSuccess.call(ctx, res, config)
        }
    } catch (e) {
        if (interceptors.beforeFailed) {
            return await intercept(ctx, () => interceptors.beforeFailed!.call(ctx, e, config), {
                onFailed: interceptors.onFailed,
                onSuccess: interceptors.onSuccess
            }, config)
        }
        interceptors.onFailed?.call(ctx, e, config)
        throw e
    }
    interceptors.onSuccess?.call(ctx, res, config)
    return res
}

const allDefaultConfig = new WeakMap<HttpService, AjaxConfig<any>>()

export function extender(a: any = {}) {
    let extendConfig = typeof a === 'object' ? a : {url: a}
    return (target: typeof HttpService) => {
        return class extends target {
            constructor() {
                super()
                let prevConfig = allDefaultConfig.get(this)
                allDefaultConfig.set(this, this.defaultConfig = mergeConfig(prevConfig, extendConfig))
            }
        }
    }
}