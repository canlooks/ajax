import {AjaxConfig, Key, Method} from '../index'
import {ajax} from './core'
import {doBeforeRequest, doRequest, mergeConfig, registerInterceptors} from './util'

let useAdapter = ajax

export function registerAdapter(adapter: (config?: AjaxConfig) => any) {
    useAdapter = adapter as any
}

export class Service {
    config: AjaxConfig

    constructor(config?: AjaxConfig) {
        const prototype = Object.getPrototypeOf(this)
        prototype[CONFIG] ||= {}
        this.config = mergeConfig(prototype[CONFIG], config)
    }

    post<T = any>(url: string, data?: any, config?: AjaxConfig<T>) {
        return this.request('POST', url, data, config)
    }

    put<T = any>(url: string, data?: any, config?: AjaxConfig<T>) {
        return this.request('PUT', url, data, config)
    }

    patch<T = any>(url: string, data?: any, config?: AjaxConfig<T>) {
        return this.request('PATCH', url, data, config)
    }

    get<T = any>(url: string, config?: AjaxConfig<T>) {
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

    protected async request<T>(method: Method, url: string, data?: any, config?: AjaxConfig<T>) {
        let finalConfig: AjaxConfig<T> = mergeConfig(this.config, config, {method, url, data})
        finalConfig = await doBeforeRequest(this, finalConfig)
        return await doRequest(this, finalConfig, () => useAdapter(finalConfig))
    }
}

const CONFIG = Symbol('config')

export function Configure(url: string): <T extends typeof Service>(target: T) => T
export function Configure(config: AjaxConfig): <T extends typeof Service>(target: T) => T
export function Configure(a: any = {}): any {
    const config = typeof a === 'object' ? a : {url: a}
    return ({prototype}: any) => {
        prototype[CONFIG] ||= {}
        mergeConfig(prototype[CONFIG], config)
    }
}

export function BeforeRequest(target: Object, propertyKey: Key): void
export function BeforeRequest(): (target: Object, propertyKey: Key) => void
export function BeforeRequest(a?: any, b?: any) {
    const fn = (prototype: Object, propertyKey: Key) => {
        registerInterceptors(prototype).beforeRequest.push(propertyKey)
    }
    return b ? fn(a, b) : fn
}

export function BeforeSuccess(target: Object, propertyKey: Key): void
export function BeforeSuccess(): (target: Object, propertyKey: Key) => void
export function BeforeSuccess(a?: any, b?: any) {
    const fn = (prototype: Object, propertyKey: Key) => {
        registerInterceptors(prototype).beforeSuccess.push(propertyKey)
    }
    return b ? fn(a, b) : fn
}

export function BeforeFail(target: Object, propertyKey: Key): void
export function BeforeFail(): (target: Object, propertyKey: Key) => void
export function BeforeFail(a?: any, b?: any) {
    const fn = (prototype: Object, propertyKey: Key) => {
        registerInterceptors(prototype).beforeFail.push(propertyKey)
    }
    return b ? fn(a, b) : fn
}

export function OnSuccess(target: Object, propertyKey: Key): void
export function OnSuccess(): (target: Object, propertyKey: Key) => void
export function OnSuccess(a?: any, b?: any) {
    const fn = (prototype: Object, propertyKey: Key) => {
        registerInterceptors(prototype).onSuccess.push(propertyKey)
    }
    return b ? fn(a, b) : fn
}

export function OnFail(target: Object, propertyKey: Key): void
export function OnFail(): (target: Object, propertyKey: Key) => void
export function OnFail(a?: any, b?: any) {
    const fn = (prototype: Object, propertyKey: Key) => {
        registerInterceptors(prototype).onFail.push(propertyKey)
    }
    return b ? fn(a, b) : fn
}

export function OnAbort(target: Object, propertyKey: Key): void
export function OnAbort(): (target: Object, propertyKey: Key) => void
export function OnAbort(a?: any, b?: any) {
    const fn = (prototype: Object, propertyKey: Key) => {
        registerInterceptors(prototype).onAbort.push(propertyKey)
    }
    return b ? fn(a, b) : fn
}