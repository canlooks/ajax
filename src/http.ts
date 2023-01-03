import http, {ClientRequestArgs} from 'http'
import https from 'https'
import {FollowOptions, http as httpFollow, https as httpsFollow} from 'follow-redirects'
import {AjaxConfig, ResponseType} from '../index'
import {AjaxAbort, AjaxError, AjaxTimeout, NetworkError} from './error'
import {querystring} from './utils'
import zlib from 'zlib'
import {AjaxInstance} from './adapter'

export function ajax<T = any>(config: AjaxConfig<T> = {}) {
    let {url, auth, maxRedirects, responseType, maxContentLength, data} = config
    if (!url) {
        throw Error('"url" is required.')
    }
    if (config.params) {
        url += '?' + querystring.stringify(config.params)
    }
    let resolve: Function
    let reject: Function
    let ajaxInstance = new AjaxInstance<T>((_resolve, _reject) => {
        resolve = _resolve
        reject = _reject
    })
    let parsedURL = new URL(url)
    if (auth) {
        parsedURL.username = auth.username || ''
        parsedURL.password = auth.password || ''
    }
    parsedURL.protocol ||= 'http:'
    let isHttps = parsedURL.protocol === 'https:'
    let lib: any = maxRedirects === 0 ?
        isHttps ? https : http :
        isHttps ? httpsFollow : httpFollow
    let headers = config.headers || {}
    let userAgentSpecified = false
    let contentLengthSpecified = false
    let contentTypeSpecified = false
    for (let key in headers) if (headers.hasOwnProperty(key)) {
        userAgentSpecified ||= /user-?agent/i.test(key)
        contentLengthSpecified ||= /content-?length/i.test(key)
        contentTypeSpecified ||= /content-?type/i.test(key)
    }
    if (!userAgentSpecified) {
        headers['User-Agent'] = '@canlooks/ajax-module'
    }
    let dataIsObject = data && typeof data === 'object'
    let dataIsStream = dataIsObject && typeof data.pipe === 'function'
    if (data && !dataIsStream) {
        if (!Buffer.isBuffer(data)) {
            if (dataIsObject) {
                data = JSON.stringify(data)
                if (!contentTypeSpecified) {
                    headers['Content-Type'] = 'application/json'
                }
            }
            if (typeof data === 'string') {
                data = Buffer.from(data, 'utf8')
            }
        }
        if (!contentLengthSpecified) {
            headers['Content-Length'] = data.length
        }
    }
    let responseData: T
    let response: ResponseType<T>
    let error: AjaxError<T> | undefined
    let options: ClientRequestArgs & FollowOptions<any> = {
        method: config.method?.toUpperCase(),
        headers,
        maxRedirects
    }
    if (config.maxBodyLength) {
        options.maxBodyLength = config.maxBodyLength
    }
    let req = lib.request(parsedURL, options, (res: any) => {
        if (req.aborted) return
        let statusCode = res.statusCode
        if (statusCode !== 204 && req.method !== 'HEAD' && config.decompress !== false) {
            let encoding = res.headers['content-encoding']
            if (encoding === 'gzip' || encoding === 'compress' || encoding === 'deflate') {
                res = res.pipe(zlib.createUnzip()) as any
                delete res.headers['content-encoding']
            }
        }
        if (responseType === 'stream') {
            responseData = res as any
            return settle()
        }
        let bufferArr: Uint8Array[] = []
        let totalLength = 0
        maxContentLength ??= 0
        res.on('data', (chunk: Uint8Array) => {
            bufferArr.push(chunk)
            totalLength += chunk.length
            if (maxContentLength! > 0 && totalLength > maxContentLength!) {
                req.destroy()
                errorHandler(AjaxError, `"maxContentLength" of ${maxContentLength} has exceeded`, config.onError)
            }
        })
            .on('error', onError)
            .on('end', () => {
                let _response: any = Buffer.concat(bufferArr)
                responseData = responseType === 'arraybuffer' ? _response : _response.toString()
                try {
                    responseData = JSON.parse(responseData as any)
                } catch (e) {
                }
                settle()
            })

        function settle() {
            response = buildResponse()
            let validateStatus = typeof config.validateStatus === 'undefined' ?
                (status: number) => status >= 200 && status < 300 :
                config.validateStatus
            if (!statusCode || !validateStatus || validateStatus(statusCode)) {
                config.onSuccess?.(response)
                return resolve(response)
            }
            return errorHandler(AjaxError, 'Request failed with status code ' + statusCode, config.onError)
        }

        function buildResponse(): ResponseType<T> {
            return {
                data: responseData,
                config,
                instance: req,
                headers: res.headers,
                get status() {
                    return req.statusCode
                },
                get statusText() {
                    return req.statusMessage
                }
            }
        }
    })
    config.abortToken?.on(abortFn)
    req.on('abort', () => {
        errorHandler(AjaxAbort, 'Request was aborted', config.onAbort, void 0)
    })
        .on('error', onError)
        .on('close', () => {
            config.onComplete?.(response, error)
            config.abortToken?.off(abortFn)
        })
        .setTimeout(config.timeout || 60000, () => {
            req.destroy(errorHandler(AjaxTimeout, 'Request timeout', config.onTimeout))
        })
    if (dataIsStream) {
        data.on('error', (e: any) => {
            data.destroy()
            req.destroy()
            errorHandler(NetworkError, 'Network error', config.onError, e)
        }).pipe(req)
    } else {
        req.end(data)
    }
    ajaxInstance.instance = req
    return ajaxInstance

    function onError(e: Error) {
        if (req.aborted) return
        errorHandler(NetworkError, 'Network error', config.onError, e)
    }

    function abortFn() {
        req.destroy()
    }

    function errorHandler(ErrorClass: typeof AjaxError, message: string, callback?: Function, originError?: Error): AjaxError<T> {
        error = new ErrorClass<T>(message, config, req, originError)
        callback?.(error)
        reject(error)
        return error
    }
}
