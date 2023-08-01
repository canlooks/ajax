export function isDev()  {
    return process.env.NODE_ENV === 'development'
}

export function stringifyQuery(obj: Record<string | number, any>) {
    if (typeof URLSearchParams === 'function') {
        return new URLSearchParams(obj) + ''
    }
    const ret = []
    for (const key in obj) {
        ret.push(`${key}=${obj[key]}`)
    }
    return encodeURIComponent(ret.join('&'))
}

export function parseHeaders(headers: string): Record<string, string | string[]> {
    const ret: Record<string, string | string[]> = {}
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

export function combineUrl(baseURL = '', relativeURL?: string) {
    if (!relativeURL) {
        return baseURL
    }
    if (/^([a-zA-Z]+:)?\/\//.test(relativeURL)) {
        return relativeURL
    }
    return `${baseURL.replace(/\/+$/, '')}/${relativeURL.replace(/^\/+/, '')}`
}
