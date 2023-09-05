import {AjaxAbort, AjaxConfig, Key} from '../index'

/**
 * 是否为开发环境
 */
export function isDev() {
    return process.env.NODE_ENV === 'development'
}

/**
 * 将对象转成URL字符串参数
 * @param obj
 */
export function stringifyQuery(obj: {[p: string | number]: any}) {
    if (typeof URLSearchParams === 'function') {
        return new URLSearchParams(obj) + ''
    }
    const ret = []
    for (const key in obj) {
        ret.push(`${key}=${obj[key]}`)
    }
    return encodeURIComponent(ret.join('&'))
}

/**
 * 将字符串类型的header转成对象
 * @param headers
 */
export function parseHeaders(headers: string): {[p: string]: string | string[]} {
    const ret: {[p: string]: string | string[]} = {}
    if (!headers) {
        return ret
    }
    const splitArr = headers.split(/[\r\n]/)
    for (let i = 0, {length} = splitArr; i < length; i++) {
        const str = splitArr[i]
        if (!str) {
            continue
        }
        const matched = str.match(/(\S*):([\s\S]*)/)
        if (!matched) {
            continue
        }
        const key = matched[1]
        if (!key) {
            continue
        }
        const value = matched[2].trim()
        if (key in ret) {
            if (!Array.isArray(ret[key])) {
                ret[key] = [ret[key] as string]
            }
            (ret[key] as string[]).push(value)
        } else {
            ret[key] = value
        }
    }
    return ret
}

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
                    continue
                }
                if (v && typeof v === 'object') {
                    target[k] ||= {}
                    mergeConfig(target[k], v)
                    continue
                }
                target[k] = v
            }
        }
    }
    return target
}

/**
 * 拼接URL
 * @param urls
 */
export function joinURL(...urls: (string | undefined)[]) {
    const fn = (baseURL = '', relativeURL?: string) => {
        if (!relativeURL) {
            return baseURL
        }
        if (/^([a-zA-Z]+:)?\/\//.test(relativeURL)) {
            return relativeURL
        }
        return baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    }
    return urls.reduce(fn, '') as string
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

/**
 * ------------------------------------------------------------------------------------------
 * 拦截器部分
 */

const INTERCEPTORS = Symbol('interceptors')

export function registerInterceptors(prototype: any) {
    return prototype[INTERCEPTORS] ||= {
        beforeRequest: [],
        beforeSuccess: [],
        beforeFail: [],
        onSuccess: [],
        onFail: [],
        onAbort: []
    }
}

export async function doBeforeRequest(context: any, config: AjaxConfig) {
    const {beforeRequest = []} = Object.getPrototypeOf(context)[INTERCEPTORS] || {}
    for (let i = 0, {length} = beforeRequest; i < length; i++) {
        config = await context[beforeRequest[i]]?.(config)
    }
    return config
}

export async function doRequest(context: any, config: AjaxConfig, action: () => any) {
    let result
    let error
    let hasError = false
    try {
        result = await action()
        try {
            result = await doBeforeSuccess(context, config, result)
        } catch (e) {
            hasError = true
            error = e
        }
    } catch (e) {
        hasError = true
        error = e
        try {
            result = await doBeforeFail(context, config, error)
            hasError = false
        } catch (e) {
            error = e
        }
    }
    if (hasError) {
        doOnFail(context, config, error)
        throw error
    }
    doOnSuccess(context, config, result)
    return result
}

async function doBeforeSuccess(context: any, config: AjaxConfig, result: any) {
    const {beforeSuccess = []} = Object.getPrototypeOf(context)[INTERCEPTORS] || {}
    for (let i = 0, {length} = beforeSuccess; i < length; i++) {
        result = await context[beforeSuccess[i]]?.(result, config)
    }
    return result
}

async function doBeforeFail(context: any, config: AjaxConfig, error: any) {
    let result
    let hasError = true
    const {beforeFail = []} = Object.getPrototypeOf(context)[INTERCEPTORS] || {}
    for (let i = 0, {length} = beforeFail; i < length; i++) {
        const fn = context[beforeFail[i]]
        if (fn) {
            try {
                result = await fn(error, config)
                hasError = false
                break
            } catch (e) {
                error = e
            }
        }
    }
    if (hasError) {
        return error
    }
    return result
}

function doOnFail(context: any, config: AjaxConfig, error: any) {
    const {onAbort = [], onFail = []} = Object.getPrototypeOf(context)[INTERCEPTORS] || {}
    if (error instanceof AjaxAbort) {
        for (let i = 0, {length} = onAbort; i < length; i++) {
            context[onAbort[i]]?.(error, config)
        }
    } else {
        for (let i = 0, {length} = onFail; i < length; i++) {
            context[onFail[i]]?.(error, config)
        }
    }
}

function doOnSuccess(context: any, config: AjaxConfig, result: any) {
    const {onSuccess = []} = Object.getPrototypeOf(context)[INTERCEPTORS] || {}
    for (let i = 0, {length} = onSuccess; i < length; i++) {
        context[onSuccess[i]]?.(result, config)
    }
}