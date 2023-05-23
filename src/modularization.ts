import {ajax} from './adapter'
import {AjaxConfig, DebugType, Method, ResponseType} from '../index'
import {AjaxAbort, AjaxError, AjaxTimeout} from './error'

let customAdapter = ajax

export function registerAdapter(adapter: (config?: AjaxConfig) => any) {
    customAdapter = adapter
}

export class HttpService {
    debug?: boolean | DebugType = process.env.NODE_ENV !== 'production'

    private get innerDebug(): DebugType {
        if (this.debug === false) {
            return {
                error: false,
                timeout: false,
                abort: false
            }
        }
        if (this.debug === true) {
            return {
                error: true,
                timeout: true,
                abort: true
            }
        }
        return this.debug || {}
    }

    mergedConfig: AjaxConfig = {}

    protected beforeRequest?(config: AjaxConfig): AjaxConfig | Promise<AjaxConfig>

    protected beforeSuccess?(data: any, config: AjaxConfig): any

    protected onSuccess?(data: any, config: AjaxConfig): void

    protected beforeFail?(error: AjaxError, config: AjaxConfig): any

    protected onFail?(error: AjaxError, config: AjaxConfig): void

    protected onAbort?(error: AjaxAbort, config: AjaxConfig): void

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
        let mergedConfig = mergeConfig(this.mergedConfig, config, {method, url, data})
        mergedConfig = await this.beforeRequest?.(mergedConfig) || mergedConfig
        return await this.intercept(() => customAdapter(mergedConfig), mergedConfig)
    }

    private intercept(action: (...a: any[]) => any, config: AjaxConfig): Promise<ResponseType<any>> {
        return new Promise(async (resolve, reject) => {
            let res
            try {
                res = await action()
                if (this.beforeSuccess) {
                    res = await this.beforeSuccess(res, config)
                }
            } catch (e: any) {
                if (this.beforeFail) {
                    return await this.intercept(() => this.beforeFail!(e, config), config)
                }
                if (e instanceof AjaxAbort) {
                    this.onAbort?.(e, config)
                    return this.innerDebug.abort && reject(e)
                }
                this.onFail?.(e, config)
                if (e instanceof AjaxTimeout && this.innerDebug.timeout) {
                    return reject(e)
                }
                return this.innerDebug.error && reject(e)
            }
            this.onSuccess?.(res, config)
            resolve(res)
        })
    }
}

function mergeConfig(...config: (AjaxConfig | undefined)[]) {
    let ret = config[0] || {}
    for (let i = 1, {length} = config; i < length; i++) {
        let next = config[i]
        if (!next) {
            continue
        }
        ret = {
            ...ret,
            ...next,
            url: combineUrl(ret.url, next.url),
            headers: {...ret.headers, ...next.headers}
        }
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
    return `${baseURL.replace(/\/+$/, '')}/${relativeURL.replace(/^\/+/, '')}`
}

export function extender(a: any = {}) {
    let extendConfig = typeof a === 'object' ? a : {url: a}
    return (target: typeof HttpService) => {
        return class extends target {
            constructor() {
                super()
                this.mergedConfig = mergeConfig(this.mergedConfig, extendConfig)
            }
        }
    }
}