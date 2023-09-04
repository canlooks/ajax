import {AjaxConfig} from '../index'
import type {ClientRequest} from 'http'

export class AjaxError<T = any> extends Error {
    constructor(
        public message: string,
        public config: AjaxConfig<T>,
        public instance: XMLHttpRequest | ClientRequest,
        public error?: Error
    ) {
        super('[@canlooks/ajax] ' + message)
        const {constructor} = Object.getPrototypeOf(this)
        const {value} = Object.getOwnPropertyDescriptor(constructor, 'defaultMessage') || {}
        if (typeof value === 'string') {
            this.message = value
        }
    }
}

export class NetworkError<T = any> extends AjaxError<T> {
    type = 'network error'

    private static defaultMessage = 'Network error'
}

export class AjaxAbort<T = any> extends AjaxError<T> {
    type = 'abort'

    private static defaultMessage = 'Request was aborted'
}

export class AjaxTimeout<T = any> extends AjaxError<T> {
    type = 'timeout'

    private static defaultMessage = 'Request timeout'
}