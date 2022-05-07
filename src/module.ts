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

    protected beforeFail?(error: AjaxError<any>, config: AjaxConfig<any>): any

    protected onFail?(error: AjaxError<any>, config: AjaxConfig<any>): void

    protected post<T = any>(url: string, data?: any, config?: AjaxConfig<T>): Promise<ResponseType<T>> {
        return this.request('POST', url, data, config)
    }

    protected put<T = any>(url: string, data?: any, config?: AjaxConfig<T>): Promise<ResponseType<T>> {
        return this.request('PUT', url, data, config)
    }

    protected patch<T = any>(url: string, data?: any, config?: AjaxConfig<T>): Promise<ResponseType<T>> {
        return this.request('PATCH', url, data, config)
    }

    protected get<T = any>(url: string, config?: AjaxConfig<T>): Promise<ResponseType<T>> {
        return this.request('GET', url, void 0, config)
    }

    protected delete<T = any>(url: string, config?: AjaxConfig<T>): Promise<ResponseType<T>> {
        return this.request('DELETE', url, void 0, config)
    }

    protected head<T = any>(url: string, config?: AjaxConfig<T>): Promise<ResponseType<T>> {
        return this.request('HEAD', url, void 0, config)
    }

    protected options<T = any>(url: string, config?: AjaxConfig<T>): Promise<ResponseType<T>> {
        return this.request('OPTIONS', url, void 0, config)
    }

    protected async request<T>(method: Method, url: string, data?: any, config?: AjaxConfig<T>) {
        let mergedConfig = mergeConfig(this.defaultConfig, config, {method, url, data})
        mergedConfig = await this.beforeRequest?.(mergedConfig) || mergedConfig
        return await intercept(this, () => customAdapter(mergedConfig), {
            beforeSuccess: this.beforeSuccess,
            onSuccess: this.onSuccess,
            beforeFail: this.beforeFail,
            onFail: this.onFail,
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
    beforeFail?: Interceptor
    onFail?: Interceptor
} = {}, config: AjaxConfig<T>): Promise<any> {
    let res
    try {
        res = await mainFn()
        if (interceptors.beforeSuccess) {
            res = await interceptors.beforeSuccess.call(ctx, res, config)
        }
    } catch (e) {
        if (interceptors.beforeFail) {
            return await intercept(ctx, () => interceptors.beforeFail!.call(ctx, e, config), {
                onFail: interceptors.onFail,
                onSuccess: interceptors.onSuccess
            }, config)
        }
        interceptors.onFail?.call(ctx, e, config)
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