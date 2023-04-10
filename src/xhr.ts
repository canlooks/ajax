import {parseHeaders, querystring} from './utils'
import {AjaxConfig, ResponseType} from '../index'
import {AjaxAbort, AjaxError, AjaxTimeout, NetworkError} from './error'
import {AjaxInstance} from './adapter'

export function ajax<T = any>(config: AjaxConfig<T> = {}) {
    let {url, auth, responseType, data} = config
    if (!url) {
        throw Error('"url" is required.')
    }
    const xhr = new XMLHttpRequest()
    const ajaxInstance = new AjaxInstance<ResponseType<T>>((resolve, reject) => {
        if (config.params) {
            url += '?' + querystring.stringify(config.params)
        }
        auth ?
            xhr.open(config.method || 'get', url!, true, auth.username, auth.password) :
            xhr.open(config.method || 'get', url!)
        if (responseType && responseType !== 'json') {
            xhr.responseType = responseType === 'stream' ? 'arraybuffer' : responseType
        }
        xhr.timeout = config.timeout || 60000
        xhr.withCredentials = !!config.withCredentials
        const headers = config.headers || {}
        let contentTypeSpecified = false
        for (const key in headers) {
            contentTypeSpecified ||= /content-?type/i.test(key)
            xhr.setRequestHeader(key, headers[key])
        }
        const validateStatus = typeof config.validateStatus === 'undefined' ?
            (status: number) => status >= 200 && status < 300 :
            config.validateStatus
        let responseData: T
        let response: ResponseType<T>
        let error: AjaxError<T> | undefined
        xhr.onload = () => {
            const {status, responseType} = xhr
            if (!status && !/^file:/.test(xhr.responseURL)) return
            responseData = !responseType || responseType === 'text' ? xhr.responseText : xhr.response
            try {
                responseData = JSON.parse(responseData as any)
            } catch (e) {
            }
            response = buildResponse()
            if (!status || !validateStatus || validateStatus(status)) {
                config.onSuccess?.(response)
                return resolve(response)
            }
            errorHandler(AjaxError, 'Request failed with status code ' + status, config.onError)
        }
        xhr.onerror = () => errorHandler(NetworkError, 'Network error', config.onError)
        xhr.ontimeout = () => errorHandler(AjaxTimeout, 'Request timeout', config.onTimeout)
        xhr.onabort = () => errorHandler(AjaxAbort, 'Request was aborted', config.onAbort)
        xhr.onprogress = config.onDownloadProgress || null
        xhr.upload.onprogress = config.onUploadProgress || null
        xhr.onloadend = () => {
            config.abortToken?.off(abortFn)
            config.onComplete?.(response, error)
        }
        config.abortToken?.on(abortFn)
        if (!data) {
            return xhr.send()
        }
        const isFormData = data instanceof FormData
        const isArrayBuffer = responseType === 'arraybuffer' || responseType === 'stream'
        !contentTypeSpecified && xhr.setRequestHeader(
            'Content-Type',
            isFormData ? 'application/x-www-form-urlencoded'
                : isArrayBuffer ? 'application/octet-stream'
                    : 'application/json'
        )
        isFormData || isArrayBuffer
            ? xhr.send(data)
            : xhr.send(JSON.stringify(data))

        function buildResponse(): ResponseType<T> {
            return {
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
                    return parseHeaders(this.rawHeaders!)
                }
            }
        }

        function abortFn() {
            xhr.abort()
        }

        function errorHandler(ErrorClass: typeof AjaxError, message: string, callback?: Function) {
            error = new ErrorClass<T>(message, config, xhr)
            callback?.(error)
            reject(error)
        }
    })
    ajaxInstance.instance = xhr
    return ajaxInstance
}