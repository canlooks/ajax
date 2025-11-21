import {AjaxReturn, ResolvedConfig} from '..'
import {AbortError, AjaxError, NetworkError, TimeoutError} from './error'
import {bodyTransform, catchCommonError, findBodyFiles} from './util'

export async function core<T = any>(config: ResolvedConfig): AjaxReturn<T> {
    let {
        url,
        params,
        onUploadProgress,
        onDownloadProgress,
        timeout = !onUploadProgress && !onDownloadProgress ? 60_000 : void 0,
        responseType = onDownloadProgress ? void 0 : 'json',
        ...init
    } = config

    /**
     * ------------------------------------------------------------------
     * URL
     */

    if (!url) {
        throw new TypeError(`"url" is required`)
    }

    if (params) {
        url += `${url.includes('?') ? '&' : '?'}${params}`
    }

    /**
     * ------------------------------------------------------------------
     * 超时与中断
     */

    let abortController: AbortController | undefined

    let timeoutId
    if (timeout) {
        abortController ||= new AbortController()
        timeoutId = setTimeout(() => {
            abortController!.abort(
                new TimeoutError(void 0, {config})
            )
        }, timeout)
    }

    if (config.signal) {
        abortController ||= new AbortController()
        config.signal.addEventListener('abort', () => {
            abortController!.abort(
                new AbortError(void 0, {config})
            )
        })
    }

    /**
     * ------------------------------------------------------------------
     * 请求
     */

    let response: Response
    const {body} = init
    try {
        response = await fetch(url, {
            ...init,
            body: bodyTransform(body),
            signal: abortController?.signal,
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
     * 进度
     */

    try {
        if (onUploadProgress) {
            const blob = body instanceof ReadableStream
                ? await new Response(body).blob()
                : findBodyFiles(body)
            if (blob) {
                const reader = blob.stream().getReader()
                let loaded = 0
                const total = blob.size
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
            }
        }

        if (onDownloadProgress) {
            const contentLength = response.headers.get('content-length')
            if (contentLength && response.body) {
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
                            total: +contentLength,
                            chunk
                        })
                    },
                    close() {
                        result = data
                    }
                })
                await response.body.pipeTo(writableStream)
            }
        }
    } catch (e) {
        throw catchCommonError(e, message => new AjaxError(message, {config, response}))
    }

    /**
     * ------------------------------------------------------------------
     * 响应
     */

    clearTimeout(timeoutId)

    if (onDownloadProgress) {
        switch (responseType) {
            case 'arrayBuffer':
                result = (result as Uint8Array).buffer
                break
            case 'blob':
                const blob = new Blob([result])
                result = blob
                break
            case void 0:
                break
            default:
                throw new AjaxError(`"${responseType}" is not supported when "onDownloadProgress" specified`, {config, response})
        }
    } else {
        try {
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
        } catch (e) {
            throw catchCommonError(e, message => new AjaxError(message, {config, response}))
        }
    }

    return {result, response, config}
}