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
    headers.split(/[\r\n]/).forEach(str => {
        if (!str) return
        const matched = str.match(/(\S*):([\s\S]*)/)
        if (!matched) return
        const key = matched[1]
        if (!key) return
        const value = matched[2].trim()
        if (key in ret) {
            if (!Array.isArray(ret[key])) {
                ret[key] = [ret[key] as string]
            }
            (ret[key] as string[]).push(value)
        } else {
            ret[key] = value
        }
    })
    return ret
}