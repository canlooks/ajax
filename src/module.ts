import type {
    AjaxConfig,
    AjaxReturn,
    InterceptorDecorator,
    RequestInterceptorType,
    ResponseInterceptorType
} from './types.js'
import {ajax} from './ajaxInstance.js'
import {mergeConfigFields} from './config.js'

export class Service {
    static config: AjaxConfig = {}

    static ajax = ajax.create(this.config)

    static get resolvedConfig() {
        return this.ajax.config
    }

    /**
     * ------------------------------------------------------------------
     * alias without body
     */

    static get<T = any>(url: string, config: AjaxConfig = {}): AjaxReturn<T> {
        return this.ajax<T>(mergeConfigFields(config, {url, method: 'GET'}))
    }

    static delete<T = any>(url: string, config: AjaxConfig = {}): AjaxReturn<T> {
        return this.ajax<T>(mergeConfigFields(config, {url, method: 'DELETE'}))
    }

    static head<T = any>(url: string, config: AjaxConfig = {}): AjaxReturn<T> {
        return this.ajax<T>(mergeConfigFields(config, {url, method: 'HEAD'}))
    }

    static options<T = any>(url: string, config: AjaxConfig = {}): AjaxReturn<T> {
        return this.ajax<T>(mergeConfigFields(config, {url, method: 'OPTIONS'}))
    }

    /**
     * ------------------------------------------------------------------
     * alias with body
     */

    static post<T = any>(url: string, body?: any, config: AjaxConfig = {}): AjaxReturn<T> {
        return this.ajax<T>(mergeConfigFields(config, {url, body, method: 'POST'}))
    }

    static put<T = any>(url: string, body?: any, config: AjaxConfig = {}): AjaxReturn<T> {
        return this.ajax<T>(mergeConfigFields(config, {url, body, method: 'PUT'}))
    }

    static patch<T = any>(url: string, body?: any, config: AjaxConfig = {}): AjaxReturn<T> {
        return this.ajax<T>(mergeConfigFields(config, {url, body, method: 'PATCH'}))
    }
}


export function Config(config: AjaxConfig) {
    return <T extends typeof Service>(target: T) => {
        target.config = config
        target.ajax = target.ajax.create(config)

        const requestInterceptors = target_requestInterceptors.get(target)
        if (requestInterceptors) {
            for (const interceptor of requestInterceptors) {
                target.ajax.requestInterceptor.add(interceptor.bind(target))
            }
        }

        const responseInterceptors = target_responseInterceptors.get(target)
        if (responseInterceptors) {
            for (const interceptor of responseInterceptors) {
                target.ajax.responseInterceptor.add(interceptor.bind(target))
            }
        }
    }
}

const target_requestInterceptors = new WeakMap<object, Set<RequestInterceptorType>>()

export function RequestInterceptor(target: Object, propertyKey: PropertyKey, descriptor: PropertyDescriptor): void
export function RequestInterceptor(): InterceptorDecorator
export function RequestInterceptor(a?: any, b?: any, c?: any) {
    const fn = () => (target: Object, propertyKey: PropertyKey, descriptor: PropertyDescriptor) => {
        setInternalMap(target_requestInterceptors, target, descriptor.value)
    }
    return c ? fn()(a, b, c) : fn()
}

const target_responseInterceptors = new WeakMap<object, Set<RequestInterceptorType>>()

export function ResponseInterceptor(target: Object, propertyKey: PropertyKey, descriptor: PropertyDescriptor): void
export function ResponseInterceptor(): InterceptorDecorator
export function ResponseInterceptor(a?: any, b?: any, c?: any) {
    const fn = () => (target: Object, propertyKey: PropertyKey, descriptor: PropertyDescriptor) => {
        setInternalMap(target_responseInterceptors, target, descriptor.value)
    }
    return c ? fn()(a, b, c) : fn()
}


function setInternalMap<T extends RequestInterceptorType | ResponseInterceptorType>(map: WeakMap<object, Set<T>>, target: Object, value: T) {
    if (typeof value === 'function') {
        const interceptors = map.get(target) || new Set()
        interceptors.add(value)
        map.set(target, interceptors)
    }
}
