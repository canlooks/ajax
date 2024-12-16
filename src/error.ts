export const prefix = '[@canlooks/ajax] '

export class AjaxError extends Error {
    constructor(message = 'Ajax Error', options?: ErrorOptions) {
        super(prefix + message, options)
    }

    type = 'ajaxError'
}

export class NetworkError extends AjaxError {
    constructor(message = 'Network Error', options?: ErrorOptions) {
        super(message, options)
    }

    type = 'networkError'
}

export class AbortError extends AjaxError {
    constructor(message = 'Request was aborted', options?: ErrorOptions) {
        super(message, options)
    }

    type = 'abortError'
}

export class TimeoutError extends AjaxError {
    constructor(message = 'Request timeout', options?: ErrorOptions) {
        super(message, options)
    }

    type = 'timeoutError'
}