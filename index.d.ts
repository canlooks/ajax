declare namespace Ajax {
    /**
     * ---------------------------------------------------------------------
     * 配置项
     */

    type Method =
        'get' | 'GET' |
        'delete' | 'DELETE' |
        'head' | 'HEAD' |
        'options' | 'OPTIONS' |
        'post' | 'POST' |
        'put' | 'PUT' |
        'patch' | 'PATCH' |
        'purge' | 'PURGE' |
        'link' | 'LINK' |
        'unlink' | 'UNLINK'

    type ProgressEvent = {
        loaded: number
        total: number
        chunk: Uint8Array
    }

    type ProgressCallback = (progressEvent: ProgressEvent) => void

    interface AjaxConfig extends RequestInit {
        method?: Method
        url?: string | URL
        params?: {[p: string | number]: any}
        /** 默认`60秒`; `0`表示无超时 */
        timeout?: number
        /**
         * 若设置了{@link onDownloadProgress}，默认为`undefined`，否则默认为`json`
         */
        responseType?: 'arrayBuffer' | 'blob' | 'formData' | 'json' | 'text'
        /**
         * 仅支持body中只有一个文件的情况，若同时上传多个文件需手动实现
         */
        onUploadProgress?: ProgressCallback
        onDownloadProgress?: ProgressCallback
    }

    /**
     * ---------------------------------------------------------------------
     * Ajax方法与alias
     */

    type AjaxReturn<T> = Promise<AjaxResponse<T>>

    type AliasWithoutBody = <T>(url: string, config?: AjaxConfig<T>) => AjaxReturn<T>

    type AliasWithBody = <T>(url: string, data: any, config?: AjaxConfig<T>) => AjaxReturn<T>

    const ajax: {
        <T>(config?: AjaxConfig<T>): AjaxReturn<T>

        get: AliasWithoutBody
        delete: AliasWithoutBody
        head: AliasWithoutBody
        options: AliasWithoutBody

        post: AliasWithBody
        put: AliasWithBody
        patch: AliasWithBody
    }

    /**
     * ---------------------------------------------------------------------
     * 响应
     */

    type AjaxResponse<T = any> = {
        result: T
        response: Response
        config: AjaxConfig
    }

    /**
     * ---------------------------------------------------------------------
     * 错误
     */

    class AjaxError extends Error {
        type: 'ajaxError' | 'networkError' | 'abortError' | 'timeoutError'
    }

    class NetworkError extends AjaxError {}

    class AbortError extends AjaxError {}

    class TimeoutError extends AjaxError {}
}

export = Ajax