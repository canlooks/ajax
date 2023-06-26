import {useEffect, useMemo} from 'react'
import {AjaxConfig, Interceptor} from '../index'

// @ts-ignore
import {AbortToken, Service} from '../dist'

// test only
// import {AbortToken, Service} from '../src'

const allAbortToken = new WeakMap<object, AbortToken>()

export function connect(connector: Record<string, typeof Service>) {
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

export function useService<T extends Service>(service: { new(config?: AjaxConfig, interceptor?: Interceptor): T }): T {
    let abortToken = useMemo(() => new AbortToken(), [])
    useEffect(() => () => {
        abortToken.abort()
    }, [])
    return useMemo(() => {
        return new service({abortToken})
    }, [])
}