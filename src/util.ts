/**
 * 将对象转成URL字符串参数
 * @param obj
 */
export function stringifyQuery(obj: { [p: string | number]: any }) {
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
export function parseHeaders(headers: string): { [p: string]: string | string[] } {
    const ret: { [p: string]: string | string[] } = {}
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