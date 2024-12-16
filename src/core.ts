import {AjaxConfig, AjaxResponse, AjaxReturn, Method} from '..'
import {AbortError, AjaxError, NetworkError, TimeoutError} from './error'
import {findBodyFiles} from './util'

export async function ajax<T = any>(config: AjaxConfig): AjaxReturn<T> {
    const {
        url,
        params,
        onUploadProgress,
        onDownloadProgress,
        timeout = !onUploadProgress && !onDownloadProgress ? 60_000 : void 0,
        responseType = onDownloadProgress ? void 0 : 'json',
        ...init
    } = config

    if (!url) {
        throw new AjaxError(`"url" is required`, {cause: {config}})
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
                new TimeoutError(void 0, {cause: {config}})
            )
        }, timeout)
    }

    if (config.signal) {
        abortController ||= new AbortController()
        config.signal.addEventListener('abort', () => {
            abortController!.abort(
                new AbortError(void 0, {cause: {config}})
            )
        })
    }

    /**
     * ------------------------------------------------------------------
     * 请求
     */

    let response: Response
    try {
        response = await fetch(url, {
            ...init,
            signal: abortController?.signal,
        })
    } catch (e) {
        console.error(e)
        throw e instanceof AjaxError ? e : new NetworkError(void 0, {cause: {config}})
    }
    if (!response.ok) {
        throw new NetworkError(`request failed with status ${response.status}`, {cause: {config}})
    }

    let result: any

    /**
     * ------------------------------------------------------------------
     * 进度
     */

    try {
        if (onUploadProgress) {
            const blob = findBodyFiles(init.body)
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
        console.error(e)
        throw e instanceof AjaxError ? e : new AjaxError(void 0, {cause: {config}})
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
            default:
                throw new AjaxError(`"${responseType}" is not supported when using "onDownloadProgress"`, {cause: {config}})
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
            console.error(e)
            throw e instanceof AjaxError ? e : new AjaxError(void 0, {cause: {config}})
        }
    }

    return {result, response, config}
}

/**
 * ------------------------------------------------------------------
 * alias
 */

ajax.get = aliasWithoutBody('get')
ajax.delete = aliasWithoutBody('delete')
ajax.head = aliasWithoutBody('head')
ajax.options = aliasWithoutBody('options')

function aliasWithoutBody(method: Method) {
    return <T = any>(url: string, config?: AjaxConfig) => ajax<T>({...config, method, url})
}

ajax.post = aliasWithBody('post')
ajax.put = aliasWithBody('put')
ajax.patch = aliasWithBody('patch')

function aliasWithBody(method: Method) {
    return <T = any>(url: string, body: any, config?: AjaxConfig) => ajax<T>({...config, method, url, body})
}