export const querystring = {
    parse(str: string) {
        if (/^\?/.test(str)) {
            str = str.slice(1)
        }
        str = decodeURI(str)
        let obj: Record<string, string> = {}
        str.split('&').forEach(v => {
            if (!/=/.test(v)) return
            let [_, key, value] = v.match(/^(.*)=(.*)$/) || []
            obj[key] = value
        })
        return obj
    },
    stringify(obj: Record<string | number, any>) {
        let ret = []
        for (let key in obj) if (obj.hasOwnProperty(key)) {
            ret.push(`${key}=${obj[key]}`)
        }
        return encodeURI(ret.join('&'))
    }
}

export function parseHeaders(headers: string): Record<string, string | string[]> {
    let ret: Record<string, string | string[]> = {}
    if (!headers) {
        return ret
    }
    headers.split(/[\r\n]/).forEach(str => {
        if (!str) return
        let matched = str.match(/(\S*):([\s\S]*)/)
        if (!matched) return
        let key = matched[1]
        if (!key) return
        let value = matched[2].trim()
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