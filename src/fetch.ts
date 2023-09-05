import {AjaxConfig} from "..";
import {AjaxError, NetworkError, prefix} from "./error";
import {stringifyQuery} from "./util";
import {AjaxInstance} from "./ajaxInstance";

export function ajax<T>(config: AjaxConfig<T> = {}) {
    let {
        url, params, timeout, headers, data, responseType, method,
        onError
    } = config
    if (!url) {
        throw Error(prefix + '"url" must be specified')
    }

    // 添加query参数
    if (params) {
        url += '?' + stringifyQuery(params)
    }

    // 创建中断实例
    const abortController = new AbortController()
    const {signal} = abortController

    // 默认超时60秒
    const timer = setTimeout(() => {
        abortController.abort()
    }, timeout ?? 60_000)

    // 设置headers
    headers ||= {}

    // 判断数据类型并设置ContentType，若用户设定了contentType则跳过
    let contentTypeSpecified = false
    for (const k in headers) {
        contentTypeSpecified = /content-?type/i.test(k)
        if (contentTypeSpecified) {
            break
        }
    }
    const isFormData = data instanceof FormData
    const isArrayBuffer = responseType === 'arraybuffer'
    if (!isFormData) {
        headers['Content-Type'] = isArrayBuffer ? 'application/octet-stream' : 'application/json'
    }

    // 创建Promise实例
    const ajaxInstance = new AjaxInstance(async (resolve, reject) => {
        let error: AjaxError | undefined
        try {
            const response = await fetch(url!, {
                ...config,
                signal,
                method: method || 'GET',
                headers,
                ...typeof data === 'undefined' || data === null ? {}
                    : isFormData || isArrayBuffer ? {body: data}
                        : {body: JSON.stringify(data)}
            })
        } catch (e) {
            makeError(NetworkError, onError, e)
        }

        /**
         * 生成错误实例
         * @param constructor
         * @param message
         * @param callback
         */
        function makeError(constructor: typeof AjaxError, callback?: (error: any) => void, error?: any, message = '') {
            error = new constructor(message, {config, error})
            callback?.(error)
            reject(error)
        }
    })
    ajaxInstance.instance = {
        abort() {
            abortController.abort()
        }
    }
    return ajaxInstance
}