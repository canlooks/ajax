import {AjaxConfig, ResolvedConfig} from '..'
import {AjaxError} from './error'

export function bodyTransform(body: BodyInit | null | undefined) {
    if (typeof body === 'object') {
        if (!(body instanceof ReadableStream)
            && !(body instanceof Blob)
            && !(body instanceof ArrayBuffer)
            && !(body instanceof FormData)
            && !(body instanceof URLSearchParams)
        ) {
            try {
                return JSON.stringify(body)
            } catch (e) {
            }
        }
    }
    return body
}

/**
 * 查找请求体中的Blob对象
 * @param body
 */
export function findBodyFiles(body: any): Blob | undefined {
    if (body instanceof Blob) {
        return body
    }
    if (typeof body === 'object' && body !== null) {
        for (const k in body) {
            const file = findBodyFiles(body[k])
            if (file) {
                return file
            }
        }
    }
    return
}

/**
 * 合并配置
 * @param config
 */
export function mergeConfig(...config: (AjaxConfig | undefined)[]): ResolvedConfig {
    return config.reduce((prev, next) => {
        return {
            ...prev,
            ...next,
            url: mergeUrl(prev?.url, next?.url),
            params: mergeParams(prev?.params, next?.params),
            headers: mergeHeaders(prev?.headers, next?.headers),
            signal: mergeAbortSignal(prev?.signal, next?.signal)
        }
    }) as ResolvedConfig
}

export function mergeUrl(prev?: string | URL, next?: string | URL): string | undefined {
    if (prev instanceof URL) {
        prev = prev.href
    }
    if (next instanceof URL) {
        next = next.href
    }
    if (!prev) {
        return next
    }
    if (!next) {
        return prev
    }
    // next开头带协议，则抛弃prev，直接使用next
    if (/^([a-z]+:)?\/\//i.test(next)) {
        return next
    }
    // prev去掉末尾的'/'，next去掉开头的'/'
    prev = prev.replace(/\/+$/, '')
    next = next.replace(/^\/+/, '')

    return `${prev}/${next}`
}

export function mergeParams(prev: AjaxConfig['params'], next: AjaxConfig['params']): URLSearchParams {
    return mergeParamsOrHeaders(URLSearchParams, prev, next)
}

export function mergeHeaders(prev?: HeadersInit, next?: HeadersInit): Headers {
    return mergeParamsOrHeaders(Headers, prev, next)
}

function mergeParamsOrHeaders(objectClass: any, prev?: any, next?: any) {
    // prev无论如何都要new，避免直接修改prev
    const obj = new objectClass(prev)
    if (!next) {
        return obj
    }
    if (!(next instanceof objectClass)) {
        next = new objectClass(next)
    }
    if (!prev) {
        return next
    }
    for (const [name, value] of next) {
        obj.set(name, value)
    }
    return obj
}

export function mergeAbortSignal(prev?: AbortSignal | null, next?: AbortSignal | null): AbortSignal | null | undefined {
    if (!prev) {
        return next
    }
    if (!next) {
        return prev
    }
    const abortController = new AbortController()
    prev.onabort = next.onabort = () => abortController.abort()
    return abortController.signal
}

export function catchCommonError(e: any, newError: (message?: string) => any) {
    return e instanceof AjaxError
        ? e
        : newError(
            e instanceof Error ? e.message
                : 'toString' in e ? e.toString()
                    : void 0
        )
}