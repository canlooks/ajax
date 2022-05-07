import {useEffect, useMemo} from 'react'
// @ts-ignore
import {AbortToken, HttpService} from '../dist'

const allAbortToken = new WeakMap<object, AbortToken>()

export function connect(connector: Record<string, typeof HttpService>) {
    return (target: any) => {
        return class extends target {
            constructor(...a: any[]) {
                super(...a)
                let abortToken = new AbortToken()
                allAbortToken.set(this, abortToken)
                Object.keys(connector).forEach(k => {
                    let service = this[k] = new connector[k]()
                    service.defaultConfig.abortToken = abortToken
                })
            }

            componentWillUnmount() {
                allAbortToken.get(this)!.abort()
                allAbortToken.delete(this)
                super.componentWillUnmount?.()
            }
        }
    }
}

export function useService<T extends HttpService>(service: { new(): T }): T {
    let abortToken = useMemo(() => new AbortToken(), [])
    useEffect(() => () => {
        abortToken.abort()
    }, [])
    return useMemo(() => {
        let instance = new service()
        instance.defaultConfig.abortToken = abortToken
        return instance
    }, [])
}