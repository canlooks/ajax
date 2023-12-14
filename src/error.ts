import {AjaxErrorCause} from '..'

export const prefix = `[@canlooks/ajax] `

export class AjaxError<T> extends Error {
    type = 'AjaxError'

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
                            for (const name in obj) {
                                addRow(obj.get(name), name)
                            }
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
    type = 'Abort'

    private static defaultMessage = 'Request was aborted'
}