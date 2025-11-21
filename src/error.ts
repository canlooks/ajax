import {AjaxErrorCause} from '../index'

export const prefix = '[@canlooks/ajax] '

export class AjaxError extends Error {
    constructor(message = 'Ajax Error', public override cause: AjaxErrorCause) {
        super(prefix + message, {cause})
    }

    type = 'ajaxError'
}

export class NetworkError extends AjaxError {
    constructor(message = 'Network Error', public override cause: AjaxErrorCause) {
        super(message, cause)
    }

    override type = 'networkError'
}

export class AbortError extends AjaxError {
    constructor(message = 'Request was aborted', public override cause: AjaxErrorCause) {
        super(message, cause)
    }

    override type = 'abortError'
}

export class TimeoutError extends AjaxError {
    constructor(message = 'Request timeout', public override cause: AjaxErrorCause) {
        super(message, cause)
    }

    override type = 'timeoutError'
}