import CAjax, {AjaxConfig, Interceptor} from '../index'
import {joinURL} from './utils'
import {AjaxAbort} from './error'

/**
 * 深度合并配置项
 * @param target
 * @param source
 */
export function mergeConfig<T extends {}, U>(target: T, source: U): T & U
export function mergeConfig<T extends {}, U, V>(target: T, source: U, source2: V): T & U & V
export function mergeConfig<T extends {}, U, V, W>(target: T, source: U, source2: V, source3: W): T & U & V & W
export function mergeConfig(target: object, ...sources: any[]): any
export function mergeConfig(target: any, ...sources: any[]) {
    for (let i = 0, {length} = sources; i < length; i++) {
        const source = sources[i]
        if (source && typeof source === 'object' || typeof source === 'string') {
            for (const k in source) {
                const v = source[k]
                if (k === 'url') {
                    target[k] = joinURL(target[k], v)
                } else {
                    target[k] = v && typeof v === 'object' ? mergeConfig(target[k], v) : v
                }
            }
        }
    }
    return target
}

const prototype_registeredFns = new WeakMap<object, ((context: any) => void)[]>()

export function registerDecorator(prototype: Object, callback: (context: any) => void) {
    getMapValueByDefault(prototype_registeredFns, prototype, () => []).push(callback)
}

/**
 * 获取Map的值并赋予默认值
 * @param map
 * @param key
 * @param defaultValue
 */
export function getMapValueByDefault<K extends object, V>(map: WeakMap<K, V>, key: K, defaultValue: () => V): V {
    let value = map.get(key)
    if (typeof value === 'undefined') {
        map.set(key, value = defaultValue())
    }
    return value
}

export function assignInterceptor(...interceptors: (Interceptor | Interceptor[] | undefined)[]) {
    let result: Interceptor[] = toArr(interceptors[0])
    for (let i = 1, {length} = interceptors; i < length; i++) {
        result = [...result, ...toArr(interceptors[i])]
    }
    return result

    function toArr(a: Interceptor | Interceptor[] | undefined) {
        return Array.isArray(a) ? a
            : a ? [a]
                : []
    }
}

export async function doBeforeRequest(interceptors: Interceptor[], config: AjaxConfig) {
    for (let i = 0, {length} = interceptors; i < length; i++) {
        const {beforeRequest} = interceptors[i]
        if (beforeRequest) {
            config = await beforeRequest(config)
        }
    }
    return config
}

export async function doRequest(action: () => any, interceptors: Interceptor[], config: AjaxConfig) {
    let result
    let error
    let hasError = false
    try {
        result = await action()
        try {
            result = await doBeforeSuccess(interceptors, result, config)
        } catch (e) {
            hasError = true
            error = e
        }
    } catch (e) {
        hasError = true
        error = e
        try {
            result = await doBeforeFail(interceptors, error, config)
            hasError = false
        } catch (e) {
            error = e
        }
    }
    if (hasError) {
        doOnFail(interceptors, error, config)
        throw error
    }
    doOnSuccess(interceptors, result, config)
    return result
}

async function doBeforeSuccess(interceptors: Interceptor[], result: any, config: AjaxConfig) {
    for (let i = 0, {length} = interceptors; i < length; i++) {
        const {beforeSuccess} = interceptors[i]
        if (beforeSuccess) {
            result = await beforeSuccess(result, config)
        }
    }
    return result
}

function doOnSuccess(interceptors: Interceptor[], result: any, config: AjaxConfig) {
    for (let i = 0, {length} = interceptors; i < length; i++) {
        interceptors[i].onSuccess?.(result, config)
    }
}

async function doBeforeFail(interceptors: Interceptor[], error: any, config: AjaxConfig) {
    let result
    let noError = false
    for (let i = 0, {length} = interceptors; i < length; i++) {
        const {beforeFail} = interceptors[i]
        if (beforeFail) {
            try {
                result = await beforeFail(error, config)
                noError = true
                break
            } catch (e) {
                error = e
            }
        }
    }
    if (noError) {
        return result
    }
    throw error
}

function doOnFail(interceptors: Interceptor[], error: any, config: AjaxConfig) {
    for (let i = 0, {length} = interceptors; i < length; i++) {
        const {onAbort, onFail} = interceptors[i]
        error instanceof AjaxAbort
            ? onAbort?.(error as any, config)
            : onFail?.(error, config)
    }
}