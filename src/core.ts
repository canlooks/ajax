import {AjaxConfig, Method, ResponseBody} from '../index'
import {parseHeaders, queryDataType, querySettleWay, stringifyQuery} from './util'
import {AbortError, AjaxError, TimeoutError, NetworkError, prefix} from './error'

export class AjaxInstance<T = any> extends Promise<T> {
    instance!: XMLHttpRequest

    abort() {
        this.instance.abort()
    }
}

export function ajax<T>(config: AjaxConfig<T> = {}) {
    let {
        url,
        params,
        auth,
        method = 'GET',
        responseType = 'json',
        timeout = 60_000,
        withCredentials,
        data,
        headers,
        abortToken,
        validateStatus = true,
        onSuccess,
        onError,
        onTimeout,
        onAbort,
        onComplete,
        onDownloadProgress,
        onUploadProgress
    } = config
    if (!url) {
        throw Error(prefix + '"url" must be specified')
    }

    // 添加query参数
    if (params) {
        url += '?' + stringifyQuery(params)
    }

    // 创建xhr实例
    const xhr = new XMLHttpRequest()
    auth
        ? xhr.open(method, url, true, auth.username, auth.password)
        : xhr.open(method, url)

    // 设置"responseType"
    xhr.responseType = responseType

    // 传递配置
    xhr.timeout = timeout
    xhr.withCredentials = !!withCredentials

    // 判断数据类型并设置ContentType
    const dataType = queryDataType(data)
    const settleWay = querySettleWay(dataType)

    if (settleWay === 'stream' || settleWay === 'json') {
        xhr.setRequestHeader(
            'Content-Type',
            settleWay === 'json' ? 'application/json' : 'application/octet-stream'
        )
    }

    // 设置请求头
    if (headers) {
        for (const key in headers) {
            xhr.setRequestHeader(key, headers[key])
        }
    }

    // 发送数据
    typeof settleWay === 'undefined'
        ? xhr.send()
        : settleWay === 'json'
            ? xhr.send(JSON.stringify(data))
            : xhr.send(data)

    // 创建Promise实例
    const ajaxInstance = new AjaxInstance((resolve, reject) => {
        // 完整响应返回结构
        let response: ResponseBody<T> | null = null
        // 错误
        let error: AjaxError<T> | null = null

        // 成功
        xhr.addEventListener('load', () => {
            const {status} = xhr
            if (!status && !/^file:/.test(xhr.responseURL)) {
                return
            }
            response = {
                result: !responseType || responseType === 'text'
                    ? xhr.responseText
                    : xhr.response,
                config,
                instance: xhr,
                status: xhr.status,
                statusText: xhr.statusText,
                get rawHeaders() {
                    return xhr.getAllResponseHeaders()
                },
                get headers() {
                    return parseHeaders(xhr.getAllResponseHeaders())
                }
            }
            // 状态码校验，默认200-300为成功
            const validateStatusFn = validateStatus === true
                ? (status: number) => status >= 200 && status < 300
                : validateStatus
            if (!status || !validateStatusFn || validateStatusFn(status)) {
                onSuccess?.(response)
                resolve(response)
            } else {
                makeError(AjaxError, onError, 'Request failed with status code ' + status)
            }
        })
        // 错误
        xhr.addEventListener('error', () => makeError(NetworkError, onError))
        // 超时
        xhr.addEventListener('timeout', () => makeError(TimeoutError, onTimeout))
        // 中断
        xhr.addEventListener('abort', () => makeError(AbortError, onAbort))
        const abortFn = () => xhr.abort()
        abortToken?.on(abortFn)

        xhr.addEventListener('loadend', () => {
            // 请求结束后移除abortToken，并触发onComplete
            abortToken?.off(abortFn)
            onComplete?.(response, error)
        })

        // 下载进度
        onDownloadProgress && xhr.addEventListener('progress', onDownloadProgress)
        // 上传进度
        onUploadProgress && xhr.upload.addEventListener('progress', onUploadProgress)

        /**
         * 生成错误实例
         * @param ErrorClass
         * @param message
         * @param callback
         */
        function makeError(ErrorClass: typeof AjaxError, callback?: (error: any) => void, message = '') {
            error = new ErrorClass(message, {
                cause: {config}
            })
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