import {AjaxConfig, Interceptor} from '../index'
import {combineUrl} from './utils'
import {AjaxAbort} from './error'

export function assignConfig(...config: (AjaxConfig | undefined)[]) {
    let result = config[0] || {}
    for (let i = 1, {length} = config; i < length; i++) {
        const next = config[i]
        if (!next) {
            continue
        }
        result = {
            ...result,
            ...next,
            url: combineUrl(result.url, next.url),
            headers: {...result.headers, ...next.headers}
        }
    }
    return result
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