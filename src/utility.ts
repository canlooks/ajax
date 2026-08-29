import type {AjaxConfig, ResolvedConfig} from './types.js'
import {AjaxError} from './error.js'

export function bodyTransform(body: BodyInit | null | undefined) {
    if (typeof body === 'object' && body !== null) {
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
export async function findBodyBlobs(body: any) {
    const blobs: Blob[] = []
    const recurse = async (obj: any) => {
        if (obj instanceof ReadableStream) {
            blobs.push(await new Response(obj).blob())
            return
        }
        if (obj instanceof Blob) {
            blobs.push(obj)
            return
        }
        if (obj instanceof ArrayBuffer) {
            blobs.push(new Blob([obj]))
            return
        }
        if (Array.isArray(obj)) {
            await Promise.all(obj.map(recurse))
            return
        }
        if (typeof obj === 'object' && obj !== null) {
            obj instanceof FormData
                ? await recurse([...obj.values()])
                : await recurse(Object.values(obj))
        }
    }
    await recurse(body)
    return blobs
}

/**
 * 合并配置
 * @param config
 */
export function mergeConfig(...config: (AjaxConfig | undefined)[]): ResolvedConfig {
    if (config.length < 1) {
        throw Error(`No config passed to "mergeConfig" method`)
    }
    const fn = (prev: AjaxConfig | undefined, next: AjaxConfig | undefined): ResolvedConfig => ({
        ...prev,
        ...next,
        url: mergeUrl(prev?.url, next?.url),
        params: mergeParams(prev?.params, next?.params),
        headers: mergeHeaders(prev?.headers, next?.headers),
        signal: mergeAbortSignal(prev?.signal, next?.signal)
    })
    if (config.length === 1) {
        return fn(config[0], void 0)
    }
    return config.reduce(fn) as ResolvedConfig
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
    if (typeof AbortSignal.any === 'function') {
        return AbortSignal.any([prev, next])
    }

    const abortController = new AbortController()
    const cleanup = () => {
        prev.removeEventListener('abort', abortPrev)
        next.removeEventListener('abort', abortNext)
    }
    const abortFrom = (source: AbortSignal) => {
        cleanup()
        abortController.abort(source.reason)
    }
    const abortPrev = () => abortFrom(prev)
    const abortNext = () => abortFrom(next)

    if (prev.aborted) {
        abortPrev()
    } else if (next.aborted) {
        abortNext()
    } else {
        prev.addEventListener('abort', abortPrev, {once: true})
        next.addEventListener('abort', abortNext, {once: true})
    }
    return abortController.signal
}

export function catchCommonError(e: any, newError: (message?: string) => any) {
    return e instanceof AjaxError
        ? e
        : newError(e instanceof Error ? e.message : String(e))
}
