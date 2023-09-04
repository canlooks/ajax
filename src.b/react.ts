import {useEffect, useMemo} from 'react'
import {AbortToken} from './'
import type {AjaxConfig, Service} from '../'

const allAbortToken = new WeakMap<object, AbortToken>()

export function connect(connector: Record<string, typeof Service>): <T>(target: T) => T
export function connect(connector: Record<string, typeof Service>): any {
    return (target: any) => {
        return class extends target {
            constructor(...a: any[]) {
                super(...a)
                const abortToken = new AbortToken()
                allAbortToken.set(this, abortToken)
                for (const k in connector) {
                    this[k] = new connector[k]({abortToken})
                }
            }

            componentWillUnmount() {
                allAbortToken.get(this)!.abort()
                allAbortToken.delete(this)
                super.componentWillUnmount?.()
            }
        }
    }
}

export function useService<T>(service: { new(config?: AjaxConfig): T }): T {
    let abortToken = useMemo(() => new AbortToken(), [])
    useEffect(() => () => {
        abortToken.abort()
    }, [])
    return useMemo(() => {
        return new service({abortToken})
    }, [])
}