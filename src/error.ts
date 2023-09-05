import {ErrorCause} from '../index'

export const prefix = '[@canlooks/ajax] '

export class AjaxError<T = any> extends Error {
    constructor(message?: string, public cause?: ErrorCause<T>) {
        const fn = (message = '', cause: ErrorCause = {}): [string, ErrorCause] => {
            const {config} = cause
            if (config) {
                if (message) {
                    message += `\r\n${'-'.repeat(50)}`
                }
                for (const k in config) {
                    const v = config[k as keyof typeof config]
                    const type = typeof v
                    if (type === 'string' || type === 'number' || type === 'boolean') {
                        const value = type === 'string' ? `"${v}"` : v
                        message += `\r\n${k}: ${value}`
                    }
                }
            }
            return [message, cause]
        }
        const [newMessage, newCause] = fn(message, cause)
        // @ts-ignore
        super(newMessage, {cause: newCause})
        if (!message) {
            const {constructor} = Object.getPrototypeOf(this)
            const {value} = Object.getOwnPropertyDescriptor(constructor, 'defaultMessage') || {}
            if (typeof value === 'string') {
                this.message = `${value}\r\n${'-'.repeat(50)}\r\n${this.message}`
            }
        }
        this.message = prefix + this.message
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