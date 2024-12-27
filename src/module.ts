import {Ajax, AjaxConfig} from '..'
import {ajax} from './ajaxInstance'
import {mergeConfig} from './util'

export class Service {
    ajax!: Ajax

    constructor(public config?: AjaxConfig) {
        this.ajax = ajax.extend(config)
    }

    /**
     * ------------------------------------------------------------------
     * alias without body
     */

    get(url: string, config: AjaxConfig = {}) {
        return this.ajax(mergeConfig(config, {url, method: 'GET'}))
    }

    delete(url: string, config: AjaxConfig = {}) {
        return this.ajax(mergeConfig(config, {url, method: 'DELETE'}))
    }

    head(url: string, config: AjaxConfig = {}) {
        return this.ajax(mergeConfig(config, {url, method: 'HEAD'}))
    }

    options(url: string, config: AjaxConfig = {}) {
        return this.ajax(mergeConfig(config, {url, method: 'OPTIONS'}))
    }

    /**
     * ------------------------------------------------------------------
     * alias with body
     */

    post(url: string, body: any, config: AjaxConfig = {}) {
        return this.ajax(mergeConfig(config, {url, body, method: 'POST'}))
    }

    put(url: string, body: any, config: AjaxConfig = {}) {
        return this.ajax(mergeConfig(config, {url, body, method: 'PUT'}))
    }

    patch(url: string, body: any, config: AjaxConfig = {}) {
        return this.ajax(mergeConfig(config, {url, body, method: 'PATCH'}))
    }
}

/**
 * ------------------------------------------------------------------
 * 类修饰器
 */

export function Module(config: AjaxConfig): any {
    return (target: typeof Service) => {
        return {
            [target.name]: class extends target {
                constructor(config1: AjaxConfig = {}) {
                    super()
                    this.ajax = this.ajax.extend(mergeConfig(config, config1))
                    setInterceptors(target.prototype, this)
                }
            }
        }[target.name]
    }
}

/**
 * ------------------------------------------------------------------
 * 方法修饰器
 */

const prototype_beforeRequestPropertySet = new WeakMap<object, Set<PropertyKey>>()
const prototype_beforeResponsePropertySet = new WeakMap<object, Set<PropertyKey>>()

export function BeforeRequest(a?: any, b?: any, c?: any): any {
    const fn = (prototype: Object, propertyKey: PropertyKey, descriptor: TypedPropertyDescriptor<any>) => {
        defineMethodDecorator(prototype, propertyKey, prototype_beforeRequestPropertySet)
    }
    return c ? fn(a, b, c) : fn
}

export function BeforeResponse(a?: any, b?: any, c?: any): any {
    const fn = (prototype: Object, propertyKey: PropertyKey, descriptor: TypedPropertyDescriptor<any>) => {
        defineMethodDecorator(prototype, propertyKey, prototype_beforeResponsePropertySet)
    }
    return c ? fn(a, b, c) : fn
}

function defineMethodDecorator(prototype: Object, propertyKey: PropertyKey, map: WeakMap<object, Set<PropertyKey>>) {
    const propertySet = map.get(prototype) || new Set()
    propertySet.add(propertyKey)
    map.set(prototype, propertySet)
}

function setInterceptors(prototype: Object, context: Service) {
    const fn = (type: 'beforeRequest' | 'beforeResponse') => {
        const map = type === 'beforeRequest' ? prototype_beforeRequestPropertySet : prototype_beforeResponsePropertySet
        const propertySet = map.get(prototype)
        if (propertySet) {
            for (const property of propertySet) {
                context.ajax[type].add((context[property as keyof Service] as any).bind(context))
            }
        }
    }
    fn('beforeRequest')
    fn('beforeResponse')
}