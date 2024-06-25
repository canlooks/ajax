import {AjaxConfig, Fn, Key, Method, RequestInterceptor, ResponseInterceptor} from '..'
import {ajax} from './core'
import {mergeConfig} from './util'

const globalVar = {
    adapter: ajax
}

export function registerAdapter(adapter: (config?: AjaxConfig) => any) {
    if (typeof adapter !== 'function') {
        throw Error('Invalid parameter at "registerAdapter()"')
    }
    globalVar.adapter = adapter as any
}

export class Service {
    static config: AjaxConfig = {}
    static requestInterceptors: RequestInterceptor[] = []
    static responseInterceptors: ResponseInterceptor[] = []

    config: AjaxConfig

    constructor(config?: AjaxConfig) {
        this.config = mergeConfig(
            Object.getPrototypeOf(this).constructor.config,
            config
        )
    }

    post(url: string, data?: any, config?: AjaxConfig) {
        return this.request('POST', url, data, config)
    }

    put(url: string, data?: any, config?: AjaxConfig) {
        return this.request('PUT', url, data, config)
    }

    patch(url: string, data?: any, config?: AjaxConfig) {
        return this.request('PATCH', url, data, config)
    }

    get(url: string, config?: AjaxConfig) {
        return this.request('GET', url, void 0, config)
    }

    delete(url: string, config?: AjaxConfig) {
        return this.request('DELETE', url, void 0, config)
    }

    head(url: string, config?: AjaxConfig) {
        return this.request('HEAD', url, void 0, config)
    }

    options(url: string, config?: AjaxConfig) {
        return this.request('OPTIONS', url, void 0, config)
    }

    async request(method: Method, url: string, data?: any, config?: AjaxConfig) {
        const constructor: typeof Service = Object.getPrototypeOf(this).constructor

        let finalConfig = mergeConfig(this.config, config, {method, url, data})
        const {requestInterceptors} = constructor
        for (let i = 0, {length} = requestInterceptors; i < length; i++) {
            finalConfig = await requestInterceptors[i](finalConfig)
        }

        let response = null
        let error = null
        let isFinalSuccess = true

        try {
            response = await globalVar.adapter(finalConfig)
            isFinalSuccess = true
        } catch (e) {
            error = e
            isFinalSuccess = false
        }

        const {responseInterceptors} = constructor
        for (let i = 0, {length} = responseInterceptors; i < length; i++) {
            try {
                response = await responseInterceptors[i](response, error, finalConfig)
                error = null
                isFinalSuccess = true
            } catch (e) {
                response = null
                error = e
                isFinalSuccess = false
            }
        }

        const callCallback = (map: WeakMap<typeof Service, Set<Fn>>, ...param: any[]) => {
            const set = map.get(constructor)
            if (set) {
                for (const cb of set) {
                    cb.call(this, ...param, finalConfig)
                }
            }
        }

        isFinalSuccess
            ? callCallback(target_onSuccess, response)
            : callCallback(target_onFailed, error)
        callCallback(target_onComplete, response, error)

        if (isFinalSuccess) {
            return response
        }
        throw error
    }
}

/**
 * -----------------------------------------------------------------------
 * 修饰器
 */

export function Configure(url: string): (target: typeof Service) => void
export function Configure(config: AjaxConfig): (target: typeof Service) => void
export function Configure(a: any = {}): any {
    const config = typeof a === 'object' ? a : {url: a}
    return (target: typeof Service) => {
        target.config = mergeConfig(target.config, config)
    }
}

export function BeforeRequest(filter: RequestInterceptor): (target: typeof Service) => void {
    return (target: typeof Service) => {
        target.requestInterceptors = [...target.requestInterceptors, filter]
    }
}

export function BeforeResponse(filter: ResponseInterceptor): (target: typeof Service) => void {
    return (target: typeof Service) => {
        target.responseInterceptors = [...target.responseInterceptors, filter]
    }
}

const target_onSuccess = new WeakMap<typeof Service, Set<Fn>>()

export function OnSuccess(target: typeof Service.prototype, _: Key, descriptor: TypedPropertyDescriptor<Fn>): void
export function OnSuccess(): (target: typeof Service.prototype, _: Key, descriptor: TypedPropertyDescriptor<Fn>) => void
export function OnSuccess(a?: any, b?: any, c?: any) {
    return callbackDecorator(target_onSuccess, a, b, c)
}

const target_onFailed = new WeakMap<typeof Service, Set<Fn>>()

export function OnFailed(target: typeof Service.prototype, _: Key, descriptor: TypedPropertyDescriptor<Fn>): void
export function OnFailed(): (target: typeof Service.prototype, _: Key, descriptor: TypedPropertyDescriptor<Fn>) => void
export function OnFailed(a?: any, b?: any, c?: any) {
    return callbackDecorator(target_onFailed, a, b, c)
}

const target_onComplete = new WeakMap<typeof Service, Set<Fn>>()

export function OnComplete(target: typeof Service.prototype, _: Key, descriptor: TypedPropertyDescriptor<Fn>): void
export function OnComplete(): (target: typeof Service.prototype, _: Key, descriptor: TypedPropertyDescriptor<Fn>) => void
export function OnComplete(a?: any, b?: any, c?: any) {
    return callbackDecorator(target_onComplete, a, b, c)
}

function callbackDecorator(map: WeakMap<typeof Service, Set<Fn>>, a?: any, b?: any, c?: any) {
    const fn = ({constructor}: any, _: Key, {value}: TypedPropertyDescriptor<Fn>) => {
        if (!value) {
            return
        }
        map.has(constructor)
            ? map.get(constructor)!.add(value)
            : map.set(constructor, new Set([value]))
    }
    return c ? fn(a, b, c) : fn
}