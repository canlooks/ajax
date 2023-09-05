import {AjaxConfig, Method, ResponseType} from '../index'
import {parseHeaders, stringifyQuery} from './util'
import {AjaxAbort, AjaxError, AjaxTimeout, NetworkError, prefix} from './error'
import {AjaxInstance} from './ajaxInstance'

export function ajax<T>(config: AjaxConfig<T> = {}) {
    let {
        url, params, auth, method, responseType, timeout, withCredentials, data, headers, abortToken, validateStatus,
        onSuccess, onError, onTimeout, onAbort, onComplete, onDownloadProgress, onUploadProgress,
    } = config
    if (!url) {
        throw Error(prefix + '"url" must be specified')
    }

    // 添加query参数
    if (params) {
        url += '?' + stringifyQuery(params)
    }

    // 默认"GET"方法
    method ||= 'GET'

    // 创建xhr实例
    const xhr = new XMLHttpRequest()
    auth
        ? xhr.open(method, url, true, auth.username, auth.password)
        : xhr.open(method, url)

    // 设置"responseType"
    if (responseType && responseType !== 'json') {
        xhr.responseType = responseType
    }

    // 默认60秒超时
    xhr.timeout = timeout ?? 60_000
    // 传递配置
    xhr.withCredentials = !!withCredentials

    // 判断数据类型并设置ContentType
    const isFormData = data instanceof FormData
    const isArrayBuffer = responseType === 'arraybuffer'
    !isFormData && xhr.setRequestHeader(
        'Content-Type',
        isArrayBuffer ? 'application/octet-stream' : 'application/json'
    )
    // 设置请求头
    headers ||= {}
    for (const key in headers) {
        xhr.setRequestHeader(key, headers[key])
    }

    // 发送数据
    typeof data === 'undefined' || data === null ? xhr.send()
        : isFormData || isArrayBuffer ? xhr.send(data)
            : xhr.send(JSON.stringify(data))

    // 创建Promise实例
    const ajaxInstance = new AjaxInstance((resolve, reject) => {
        // 响应数据
        let responseData: any
        // 完整响应返回结构
        let response: ResponseType
        // 错误
        let error: AjaxError<T> | undefined

        // 成功
        xhr.onload = () => {
            const {status} = xhr
            if (!status && !/^file:/.test(xhr.responseURL)) {
                return
            }
            responseData = !responseType || responseType === 'text' ? xhr.responseText : xhr.response
            try {
                responseData = JSON.parse(responseData as any)
            } catch (e) {
            }
            response = {
                data: responseData,
                config,
                instance: xhr,
                get status() {
                    return xhr.status
                },
                get statusText() {
                    return xhr.statusText
                },
                get rawHeaders() {
                    return xhr.getAllResponseHeaders()
                },
                get headers() {
                    return parseHeaders(xhr.getAllResponseHeaders())
                }
            }
            // 状态码校验，默认200-300为成功
            const validateStatusFn = typeof validateStatus === 'undefined' || validateStatus === true
                ? (status: number) => status >= 200 && status < 300
                : validateStatus
            if (!status || !validateStatusFn || validateStatusFn(status)) {
                onSuccess?.(response)
                return resolve(response)
            }
            makeError(AjaxError, onError, 'Request failed with status code ' + status)
        }
        // 错误
        xhr.onerror = () => makeError(NetworkError, onError)
        // 超时
        xhr.ontimeout = () => makeError(AjaxTimeout, onTimeout)

        // 中断
        xhr.onabort = () => makeError(AjaxAbort, onAbort)
        const abortFn = () => xhr.abort()
        abortToken?.on(abortFn)
        xhr.onloadend = () => {
            // 请求结束后移除abortToken，并触发onComplete
            abortToken?.off(abortFn)
            onComplete?.(response, error)
        }

        // 下载进度
        if (onDownloadProgress) {
            xhr.onprogress = onDownloadProgress
        }
        // 上传进度
        if (onUploadProgress) {
            xhr.upload.onprogress = onUploadProgress
        }

        /**
         * 生成错误实例
         * @param constructor
         * @param message
         * @param callback
         */
        function makeError(constructor: typeof AjaxError, callback?: (error: any) => void, message = '') {
            error = new constructor(message, {config, instance: xhr})
            callback?.(error)
            reject(error)
        }
    })
    ajaxInstance.instance = xhr
    return ajaxInstance
}

ajax.get = aliasWithoutData('get')
ajax.delete = aliasWithoutData('delete')
ajax.head = aliasWithoutData('head')
ajax.options = aliasWithoutData('options')

function aliasWithoutData(method: Method) {
    return <T = any>(url: string, config?: AjaxConfig<T>) => ajax<T>({...config, method, url})
}

ajax.post = aliasWithData('post')
ajax.put = aliasWithData('put')
ajax.patch = aliasWithData('patch')

function aliasWithData(method: Method) {
    return <T = any>(url: string, data: any, config?: AjaxConfig<T>) => ajax<T>({...config, method, url, data})
}