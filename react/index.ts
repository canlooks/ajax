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
                let http: any = {}
                Object.keys(connector).forEach(k => {
                    let service = http[k] = new connector[k]()
                    service.defaultConfig.abortToken = abortToken
                })
                this.http = http
            }

            componentWillUnmount() {
                allAbortToken.get(this)!.abort()
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