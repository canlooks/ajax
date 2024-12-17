import {useEffect, useMemo} from 'react'

type ClassType<T = any> = new (...args: any[]) => T

const instance_abortController = new WeakMap<object, AbortController>()

/**
 * React类组件修饰器
 * @param connector
 */
export function connect(connector: {[p: string]: ClassType}): <T>(target: T) => T
export function connect(connector: {[p: string]: ClassType}): any {
    return (target: any) => {
        return {
            [target.name]: class extends target {
                constructor(...a: any[]) {
                    super(...a)
                    const abortToken = new AbortController()
                    instance_abortController.set(this, abortToken)
                    for (const k in connector) {
                        this[k] = new connector[k]({abortToken})
                    }
                }

                componentWillUnmount() {
                    instance_abortController.get(this)!.abort()
                    instance_abortController.delete(this)
                    super.componentWillUnmount?.()
                }
            }[target.name]
        }
    }
}

export function useService<T>(service: ClassType<T>): T {
    let abortToken = useMemo(() => new AbortController(), [])

    useEffect(() => () => {
        abortToken.abort()
    }, [])

    return useMemo(() => new service({signal: abortToken.signal}), [])
}