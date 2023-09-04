import {AjaxConfig} from '../index'
import {ClientRequest} from 'http'

export class AjaxError<T = any> extends Error {
    constructor(
        public message: string,
        public config: AjaxConfig<T>,
        public instance: XMLHttpRequest | ClientRequest,
        public error?: Error
    ) {
        super(message)
    }
}

export class NetworkError<T> extends AjaxError<T> {
    type = 'network error'
}

export class AjaxAbort extends AjaxError {
    type = 'abort'
}

export class AjaxTimeout extends AjaxError {
    type = 'timeout'
}