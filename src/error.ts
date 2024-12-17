export const prefix = '[@canlooks/ajax] '

export class AjaxError extends Error {
    constructor(message = 'Ajax Error', cause?: any) {
        super(prefix + message, {cause})
    }

    type = 'ajaxError'
}

export class NetworkError extends AjaxError {
    constructor(message = 'Network Error', cause?: any) {
        super(message, cause)
    }

    override type = 'networkError'
}

export class AbortError extends AjaxError {
    constructor(message = 'Request was aborted', cause?: any) {
        super(message, cause)
    }

    override type = 'abortError'
}

export class TimeoutError extends AjaxError {
    constructor(message = 'Request timeout', cause?: any) {
        super(message, cause)
    }

    override type = 'timeoutError'
}