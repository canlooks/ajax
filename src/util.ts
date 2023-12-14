import {AjaxConfig} from '..'

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
 * 判断data的类型
 * @param data 
 */
export function queryDataType(data: any) {
    const type = typeof data
    if (type === 'undefined' || data === null) {
        return 'undefined'
    }
    if (data instanceof Blob) {
        return 'Blob'
    }
    if (data instanceof ArrayBuffer) {
        return 'ArrayBuffer'
    }
    if (data instanceof FormData) {
        return 'FormData'
    }
    if (data instanceof URLSearchParams) {
        return 'URLSearchParams'
    }
    return type
}

/**
 * 处理数据的方法
 * @param dataType 
 */
export function querySettleWay(dataType: string) {
    switch (dataType) {
        case 'Blob':
        case 'ArrayBuffer':
        case 'FormData':
            return 'stream'

        case 'undefined':
        case 'string':
        case 'URLSearchParams':
            return dataType

        default:
            return 'json'
    }
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
 * -------------------------------------------------------------------------
 * 模块化部分
 */

/**
 * 深度合并配置项
 * @param target
 * @param source
 */
export function mergeConfig(...configs: (AjaxConfig | undefined)[]): AjaxConfig {
    return configs.reduce((prev = {}, next?: AjaxConfig) => {
        return next
            ? {
                ...prev,
                ...next,
                // url有专门的合并方法
                url: joinURL(prev.url, next.url),
                // headers需要深合并
                headers: {
                    ...prev.headers,
                    ...next.headers
                }
            }
            : prev
    })!
}

/**
 * 拼接URL
 * @param urls
 */
export function joinURL(...urls: (string | undefined)[]) {
    return urls.reduce((prev = '', next?: string) => {
        if (!next) {
            return prev
        }
        // 开头是协议（如http://），则抛弃之前的，重新开始
        if (/^([a-zA-Z]+:)?\/\//.test(next)) {
            return next
        }
        return `${prev.replace(/\/+$/, '')}/${next.replace(/^\/+/, '')}`
    })!
}