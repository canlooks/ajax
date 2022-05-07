import {AjaxConfig} from '../index'
import {ClientRequest} from 'http'

export class AjaxError<T> extends Error {
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

export class AjaxAbort extends AjaxError<any> {
    type = 'abort'
}

export class AjaxTimeout extends AjaxError<any> {
    type = 'timeout'
}