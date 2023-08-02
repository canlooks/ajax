import {ajax} from './adapter'
import {AjaxConfig, Interceptor, Method} from '../index'
import {assignConfig, assignInterceptor, doBeforeRequest, doRequest} from './modularizationUtils'
import {isDev} from './utils'

let useAdapter = ajax

export function registerAdapter(adapter: (config?: AjaxConfig) => any) {
    useAdapter = adapter
}

export class Service {
    private readonly interceptors: Interceptor[]

    constructor(private config?: AjaxConfig, interceptors?: Interceptor | Interceptor[]) {
        this.interceptors = assignInterceptor(interceptors)
    }

    protected post<T = any>(url: string, data?: any, config?: AjaxConfig<T>) {
        return this.request('POST', url, data, config)
    }

    protected put<T = any>(url: string, data?: any, config?: AjaxConfig<T>) {
        return this.request('PUT', url, data, config)
    }

    protected patch<T = any>(url: string, data?: any, config?: AjaxConfig<T>) {
        return this.request('PATCH', url, data, config)
    }

    protected get<T = any>(url: string, config?: AjaxConfig<T>) {
        return this.request('GET', url, void 0, config)
    }

    protected delete<T = any>(url: string, config?: AjaxConfig<T>) {
        return this.request('DELETE', url, void 0, config)
    }

    protected head<T = any>(url: string, config?: AjaxConfig<T>) {
        return this.request('HEAD', url, void 0, config)
    }

    protected options<T = any>(url: string, config?: AjaxConfig<T>) {
        return this.request('OPTIONS', url, void 0, config)
    }

    protected async request<T>(method: Method, url: string, data?: any, config?: AjaxConfig<T>): Promise<T> {
        let assignedConfig = assignConfig(this.config, config, {method, url, data})
        assignedConfig = await doBeforeRequest(this.interceptors, assignedConfig)
        return await doRequest(() => useAdapter(assignedConfig), this.interceptors, assignedConfig)
    }
}

export function interceptor(interceptors: Interceptor | Interceptor[]): <T extends typeof Service>(target: T) => T
export function interceptor(interceptors: Interceptor | Interceptor[]): any {
    return (target: typeof Service) => {
        const ret = class extends target {
            constructor(config?: AjaxConfig, lastInterceptor?: Interceptor | Interceptor[]) {
                super(config, assignInterceptor(interceptors, lastInterceptor))
            }
        }
        isDev() && Object.defineProperty(ret, 'name', {
            value: target.name + '_assignedInterceptor'
        })
        return ret
    }
}

export function configure(url: string): <T extends typeof Service>(target: T) => T
export function configure(config: AjaxConfig): <T extends typeof Service>(target: T) => T
export function configure(a: any = {}): any {
    const config = typeof a === 'object' ? a : {url: a}
    return (target: typeof Service) => {
        const ret = class extends target {
            constructor(lastConfig?: AjaxConfig, interceptor?: Interceptor | Interceptor[]) {
                super(assignConfig(config, lastConfig), interceptor)

            }
        }
        isDev() && Object.defineProperty(ret, 'name', {
            value: target.name + '_assignedConfig'
        })
        return ret
    }
}