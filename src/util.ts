import {AjaxConfig, ResolvedConfig} from '..'

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
export function mergeConfig(...config: AjaxConfig[]): ResolvedConfig {
    return config.reduce((prev, next) => {
        return {
            ...prev,
            ...next,
            url: mergeUrl(prev.url, next.url),
            params: mergeParams(prev.params, next.params),
            headers: mergeHeaders(prev.headers, next.headers),
            signal: mergeSignal(prev.signal, next.signal)
        }
    }) as ResolvedConfig

    function mergeUrl(prev?: string | URL, next?: string | URL): string | undefined {
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
        if (/^([a-z]+:)?\/\//i.test(next)) {
            return next
        }
        prev = prev.replace(/\/+$/, '')
        next = next.replace(/^\/+/, '')
        return `${prev}/${next}`
    }

    function mergeParams(prev: AjaxConfig['params'], next: AjaxConfig['params']): URLSearchParams {
        const params = new URLSearchParams(prev)
        if (!(next instanceof URLSearchParams)) {
            next = new URLSearchParams(next)
        }
        if (!prev) {
            return next
        }
        if (!next) {
            return params
        }
        for (const [name, value] of next) {
            params.set(name, value)
        }
        return params
    }

    function mergeHeaders(prev?: HeadersInit, next?: HeadersInit): Headers {
        const headers = new Headers(prev)
        if (!(next instanceof Headers)) {
            next = new Headers(next)
        }
        if (!prev) {
            return next
        }
        if (!next) {
            return headers
        }
        for (const [name, value] of next) {
            headers.set(name, value)
        }
        return headers
    }

    function mergeSignal(prev?: AbortSignal | null, next?: AbortSignal | null): AbortSignal | null | undefined {
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
}