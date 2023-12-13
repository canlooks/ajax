import {AjaxConfig, Fn, Key, Method, RequestInterceptor, ResponseInterceptor} from '..'
import {ajax} from './core'
import {mergeConfig} from './util'

const globalVar = {
    useAdapter: ajax
}

export function registerAdapter(adapter: (config?: AjaxConfig) => any) {
    if (typeof adapter !== 'function') {
        throw Error('Invalid parameter at "registerAdapter()"')
    }
    globalVar.useAdapter = adapter as any
}

export class Service {
    static config: AjaxConfig = {}
    static requestInterceptors: RequestInterceptor[] = []
    static responseInterceptors: ResponseInterceptor[] = []

    static post(url: string, data?: any, config?: AjaxConfig) {
        return this.request('POST', url, data, config)
    }

    static put(url: string, data?: any, config?: AjaxConfig) {
        return this.request('PUT', url, data, config)
    }

    static patch(url: string, data?: any, config?: AjaxConfig) {
        return this.request('PATCH', url, data, config)
    }

    static get(url: string, config?: AjaxConfig) {
        return this.request('GET', url, void 0, config)
    }

    static delete(url: string, config?: AjaxConfig) {
        return this.request('DELETE', url, void 0, config)
    }

    static head(url: string, config?: AjaxConfig) {
        return this.request('HEAD', url, void 0, config)
    }

    static options(url: string, config?: AjaxConfig) {
        return this.request('OPTIONS', url, void 0, config)
    }

    static async request(method: Method, url: string, data?: any, config?: AjaxConfig) {
        let finalConfig = mergeConfig(this.config, config, {method, url, data})
        finalConfig = await this.doBeforeRequest(finalConfig)

        let response = null
        let error = null
        let isFinalSuccess = false

        try {
            response = await globalVar.useAdapter(finalConfig)
            isFinalSuccess = true
        } catch (e) {
            error = e
            isFinalSuccess = false
        }

        const {responseInterceptors} = this
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

        if (isFinalSuccess) {
            // TODO 做到这里
            return response
        }
        throw error
    }

    private static async doBeforeRequest(config: AjaxConfig) {
        const {requestInterceptors} = this
        for (let i = 0, {length} = requestInterceptors; i < length; i++) {
            config = await requestInterceptors[i].call(this, config)
        }
        return config
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

// onSuccess

// onFailed (error, timeout, abort整合成onFailed)

const target_onComplete = new WeakMap<typeof Service, Set<Fn>>()

export function onComplete(target: typeof Service, _: Key, descriptor: TypedPropertyDescriptor<Fn>): void
export function onComplete(): (target: typeof Service, _: Key, descriptor: TypedPropertyDescriptor<Fn>) => void
export function onComplete(a?: any, b?: any, c?: any) {
    const fn = (target: typeof Service, _: Key, {value}: TypedPropertyDescriptor<Fn>) => {
        if (!value) {
            return
        }
        target_onComplete.has(target)
            ? target_onComplete.get(target)!.add(value)
            : target_onComplete.set(target, new Set([value]))
    }
    return c ? fn(a, b, c) : fn
}