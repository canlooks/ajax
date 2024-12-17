import {AjaxConfig, NormalizedAjaxConfig} from '..'

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
export function mergeConfig(...config: AjaxConfig[]): NormalizedAjaxConfig {
    return config.reduce((prev, next) => {
        return {
            ...prev,
            ...next,
            ...prev.url && next.url
                ? {url: mergeUrl(prev.url, next.url)}
                : {},
            ...prev.params && next.params
                ? {params: mergeParams(prev.params, next.params)}
                : {},
            ...prev.headers && next.headers
                ? {headers: mergeHeaders(prev.headers, next.headers)}
                : {},
            ...prev.signal && next.signal
                ? {signal: mergeSignal(prev.signal, next.signal)}
                : {}
        }
    }) as NormalizedAjaxConfig

    function mergeUrl(prev: string | URL, next: string | URL): URL {
        const base = new URL(prev)
        return new URL(next, base)
    }

    function mergeParams(prev: AjaxConfig['params'], next: AjaxConfig['params']): URLSearchParams {
        const params = new URLSearchParams(prev)
        if (!(next instanceof URLSearchParams)) {
            next = new URLSearchParams(next)
        }
        for (const [name, value] of next) {
            params.set(name, value)
        }
        return params
    }

    function mergeHeaders(prev: HeadersInit, next: HeadersInit): Headers {
        const headers = new Headers(prev)
        if (!(next instanceof Headers)) {
            next = new Headers(next)
        }
        for (const [name, value] of next) {
            headers.set(name, value)
        }
        return headers
    }

    function mergeSignal(prev: AbortSignal, next: AbortSignal) {
        const abortController = new AbortController()
        prev.onabort = next.onabort = () => abortController.abort()
        return abortController.signal
    }
}