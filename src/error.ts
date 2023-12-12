import {AjaxErrorCause} from '..'
import {name} from '../package.json'

export const prefix = `[${name}] `

export class AjaxError<T> extends Error {
    type = 'Ajax Error'

    constructor(message?: string, options?: {
        cause?: AjaxErrorCause<T>
    }) {
        const mergeMessage = (msg = '', cause: AjaxErrorCause<any> = {}) => {
            const {target, propertyKey, config, error} = cause

            if (target || propertyKey) {
                const targetName = target.name || target.constructor?.name || '[unknown]'
                const methodName = propertyKey?.toString() || '[unknown]'
                msg += `, which occured in "${targetName}.${methodName}()"`
            }

            if (config) {
                if (msg) {
                    msg += '\r\n'
                }
                msg += 'url: ' + config.url

                const buildLog = (type: 'data' | 'headers') => {
                    const obj = config[type]
                    if (obj && typeof obj === 'object') {
                        msg += `\r\n${type}: {`
                        const addRow = (value: any, key: string) => {
                            msg += `\r\n\t${key}: ${typeof value === 'string' ? `"${value}"` : value}`
                        }
                        if (obj instanceof FormData) {
                            obj.forEach(addRow)
                        } else {
                            for (const key in obj) {
                                addRow(obj[key], key)
                            }
                        }
                        msg += '\r\n}'
                    }
                }
                buildLog('data')
                buildLog('headers')
            }

            if (error) {
                const subMessage = mergeMessage(error.message, error.cause)
                if (subMessage) {
                    msg += `\r\n${'-'.repeat(50)}\r\n${subMessage}`
                }
            }

            return msg
        }

        super(mergeMessage(message, options?.cause), options)
        if (!message) {
            const {constructor} = Object.getPrototypeOf(this)
            const {value} = Object.getOwnPropertyDescriptor(constructor, 'defaultMessage') || {}
            if (typeof value === 'string') {
                this.message = this.message
                    ? `${value}\r\n${this.message}`
                    : value
            }
        }
        this.message = prefix + this.message
    }
}

export class NetworkError<T> extends AjaxError<T> {
    type = 'NetworkError'

    private static defaultMessage = 'Network error'
}

export class TimeoutError<T> extends AjaxError<T> {
    type = 'Timeout'

    private static defaultMessage = 'Request timeout'
}

export class AbortError<T> extends AjaxError<T> {
    type = 'Aborted'

    private static defaultMessage = 'Request was aborted'
}


// import {ErrorCause} from '..'

// export const prefix = '[@canlooks/ajax] '

// export class AjaxError<T = any> extends Error {
//     constructor(message?: string, public cause?: ErrorCause<T>) {
//         const fn = (message = '', cause: ErrorCause = {}): [string, ErrorCause] => {
//             const {config} = cause
//             if (config) {
//                 if (message) {
//                     message += `\r\n${'-'.repeat(50)}`
//                 }
//                 for (const k in config) {
//                     const v = config[k as keyof typeof config]
//                     const type = typeof v
//                     if (type === 'string' || type === 'number' || type === 'boolean') {
//                         const value = type === 'string' ? `"${v}"` : v
//                         message += `\r\n${k}: ${value}`
//                     }
//                 }
//             }
//             return [message, cause]
//         }
//         const [newMessage, newCause] = fn(message, cause)
//         // @ts-ignore
//         super(newMessage, {cause: newCause})
//         if (!message) {
//             const {constructor} = Object.getPrototypeOf(this)
//             const {value} = Object.getOwnPropertyDescriptor(constructor, 'defaultMessage') || {}
//             if (typeof value === 'string') {
//                 this.message = `${value}\r\n${'-'.repeat(50)}\r\n${this.message}`
//             }
//         }
//         this.message = prefix + this.message
//     }
// }

// export class NetworkError<T = any> extends AjaxError<T> {
//     type = 'network error'

//     private static defaultMessage = 'Network error'
// }

// export class AjaxAbort<T = any> extends AjaxError<T> {
//     type = 'abort'

//     private static defaultMessage = 'Request was aborted'
// }

// export class AjaxTimeout<T = any> extends AjaxError<T> {
//     type = 'timeout'

//     private static defaultMessage = 'Request timeout'
// }