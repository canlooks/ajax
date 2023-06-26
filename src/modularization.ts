import {ajax} from './adapter'
import {AjaxConfig, Interceptor, Method, ResponseType} from '../index'
import {assignConfig, assignInterceptor, doBeforeRequest, doRequest} from './modularizationMethods'

let useAdapter = ajax

export function registerAdapter(adapter: (config?: AjaxConfig) => any) {
    useAdapter = adapter
}

const ASSIGNED_CONFIG = Symbol('assigned-config')
const ASSIGNED_INTERCEPTORS = Symbol('assigned-interceptors')

export class Service {
    protected [ASSIGNED_CONFIG]: AjaxConfig = {}
    protected [ASSIGNED_INTERCEPTORS]: Interceptor[] = []

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

    protected async request<T>(method: Method, url: string, data?: any, config?: AjaxConfig<T>): Promise<ResponseType<T>> {
        let assignedConfig = assignConfig(this[ASSIGNED_CONFIG], config, {method, url, data})
        assignedConfig = await doBeforeRequest(this[ASSIGNED_INTERCEPTORS], assignedConfig)
        return await doRequest(() => useAdapter(assignedConfig), this[ASSIGNED_INTERCEPTORS], assignedConfig)
    }
}

export function assign(url: string, interceptors?: Interceptor): <T extends typeof Service>(target: T) => T
export function assign(config: AjaxConfig, interceptors?: Interceptor): <T extends typeof Service>(target: T) => T
export function assign(a: any = {}, interceptors?: Interceptor) {
    const config = typeof a === 'object' ? a : {url: a}
    return (target: typeof Service) => {
        return class AssignedService extends target {
            constructor() {
                super()
                this[ASSIGNED_CONFIG] = assignConfig(this[ASSIGNED_CONFIG], config)
                this[ASSIGNED_INTERCEPTORS] = assignInterceptor(this[ASSIGNED_INTERCEPTORS], interceptors)
            }
        }
    }
}