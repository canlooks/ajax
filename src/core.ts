import type {AjaxReturn, Method, ResolvedConfig} from './types.js'
import {AbortError, AjaxError, NetworkError, TimeoutError} from './error.js'
import {bodyTransform, catchCommonError, findBodyBlobs} from './utility.js'

export async function core<T = any>(config: ResolvedConfig): AjaxReturn<T> {
    if (config.method) {
        config = {
            ...config,
            method: config.method.toUpperCase() as Method
        }
    }

    let {
        url,
        params,
        onUploadProgress,
        onDownloadProgress,
        timeout = !onUploadProgress && !onDownloadProgress ? 60_000 : void 0,
        responseType = onDownloadProgress ? 'none' : 'json',
        ...init
    } = config

    /**
     * ------------------------------------------------------------------
     * URL
     */

    if (!url) {
        throw new TypeError(`"url" is required`)
    }

    if (params.size) {
        url += `${url.includes('?') ? '&' : '?'}${params}`
    }

    /**
     * ------------------------------------------------------------------
     * 请求生命周期：超时、外部取消和所有资源清理
     */

    let abortController: AbortController | undefined
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let removeAbortListener: (() => void) | undefined
    let response: Response
    const {body} = init

    try {
        if (timeout) {
            abortController ||= new AbortController()
            timeoutId = setTimeout(() => {
                abortController!.abort(
                    new TimeoutError(void 0, {config, response})
                )
            }, timeout)
        }

        if (config.signal) {
            abortController ||= new AbortController()
            const externalSignal = config.signal
            const abortFromExternalSignal = () => {
                const originalReason = externalSignal.reason
                abortController!.abort(
                    originalReason instanceof AbortError
                        ? originalReason
                        : new AbortError(void 0, {config, response, reason: originalReason})
                )
            }

            if (externalSignal.aborted) {
                abortFromExternalSignal()
            } else {
                externalSignal.addEventListener('abort', abortFromExternalSignal, {once: true})
                removeAbortListener = () => externalSignal.removeEventListener('abort', abortFromExternalSignal)
            }
        }

        /**
         * ------------------------------------------------------------------
         * 请求
         */

        try {
            if (abortController?.signal.aborted) {
                throw abortController.signal.reason
            }
            response = await fetch(url, {
                ...init,
                body: bodyTransform(body),
                signal: abortController?.signal
            })
        } catch (e) {
            throw catchCommonError(e, message => new NetworkError(message, {config, response}))
        }

        if (!response.ok) {
            throw new NetworkError(`request failed with status ${response.status}`, {config, response})
        }

        let result: any

        /**
         * ------------------------------------------------------------------
         * 上传进度、下载进度与响应解析
         */

        try {
            if (onUploadProgress) {
                const blobs = await findBodyBlobs(body)
                if (blobs.length) {
                    const total = blobs.reduce((prev, curr) => prev + curr.size, 0)
                    let loaded = 0

                    await Promise.all(
                        blobs.map(async blob => {
                            const reader = blob.stream().getReader()
                            const read = async () => {
                                const {done, value} = await reader.read()
                                if (done) {
                                    return
                                }
                                onUploadProgress({
                                    loaded: loaded += value.byteLength,
                                    total,
                                    chunk: value
                                })
                                await read()
                            }
                            await read()
                        })
                    )
                }
            }

            if (onDownloadProgress) {
                const contentLength = response.headers.get('content-length')
                const total = contentLength === null ? NaN : Number(contentLength)
                const canStreamWithProgress = response.body !== null
                    && Number.isFinite(total)
                    && total >= 0

                if (canStreamWithProgress) {
                    let data = new Uint8Array()
                    const writableStream = new WritableStream<Uint8Array>({
                        write(chunk) {
                            const totalLength = data.byteLength + chunk.byteLength
                            const newData = new Uint8Array(totalLength)
                            newData.set(data)
                            newData.set(chunk, data.byteLength)
                            data = newData
                            onDownloadProgress({
                                loaded: data.byteLength,
                                total,
                                chunk
                            })
                        },
                        close() {
                            result = data
                        }
                    })
                    await response.body!.pipeTo(writableStream)
                }

                switch (responseType) {
                    case 'arrayBuffer':
                        result = result instanceof Uint8Array
                            ? new Uint8Array(result).buffer
                            : await response.arrayBuffer()
                        break
                    case 'blob':
                        result = result instanceof Uint8Array
                            ? new Blob([new Uint8Array(result).buffer])
                            : await response.blob()
                        break
                    case 'none':
                    case void 0:
                        break
                    default:
                        throw new AjaxError(
                            `responseType: "${responseType}" is not supported when "onDownloadProgress" specified`,
                            {config, response}
                        )
                }
            } else {
                switch (responseType) {
                    case 'json':
                        result = await response.json()
                        break
                    case 'text':
                        result = await response.text()
                        break
                    case 'blob':
                        result = await response.blob()
                        break
                    case 'arrayBuffer':
                        result = await response.arrayBuffer()
                        break
                    case 'formData':
                        result = await response.formData()
                }
            }
        } catch (e) {
            throw catchCommonError(e, message => new AjaxError(message, {config, response}))
        }

        return {result, response, config}
    } finally {
        if (typeof timeoutId !== 'undefined') {
            clearTimeout(timeoutId)
        }
        removeAbortListener?.()
    }
}
