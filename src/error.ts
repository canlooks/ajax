import {AjaxConfig} from '../index'
import {ClientRequest} from 'http'

export class AjaxError<T> extends Error {
    type?: string
    message: string
    config: AjaxConfig<T>
    instance?: XMLHttpRequest | ClientRequest
    error?: Error

    constructor(message: string, config: AjaxConfig<T>, instance: XMLHttpRequest | ClientRequest, originError?: Error) {
        super(message)
        this.message = message
        this.config = config
        this.instance = instance
        this.error = originError
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