import {AjaxConfig, InterceptorDecorator, RequestInterceptorType, ResponseInterceptorType} from '../index'
import {ajax} from './ajaxInstance'
import {mergeConfig} from './utility'

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

    static get(url: string, config: AjaxConfig = {}) {
        return this.ajax(mergeConfig(config, {url, method: 'GET'}))
    }

    static delete(url: string, config: AjaxConfig = {}) {
        return this.ajax(mergeConfig(config, {url, method: 'DELETE'}))
    }

    static head(url: string, config: AjaxConfig = {}) {
        return this.ajax(mergeConfig(config, {url, method: 'HEAD'}))
    }

    static options(url: string, config: AjaxConfig = {}) {
        return this.ajax(mergeConfig(config, {url, method: 'OPTIONS'}))
    }

    /**
     * ------------------------------------------------------------------
     * alias with body
     */

    static post(url: string, body?: any, config: AjaxConfig = {}) {
        return this.ajax(mergeConfig(config, {url, body, method: 'POST'}))
    }

    static put(url: string, body?: any, config: AjaxConfig = {}) {
        return this.ajax(mergeConfig(config, {url, body, method: 'PUT'}))
    }

    static patch(url: string, body?: any, config: AjaxConfig = {}) {
        return this.ajax(mergeConfig(config, {url, body, method: 'PATCH'}))
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