import {useEffect, useMemo} from 'react'
import {Service} from './module'
import {AjaxConfig} from '..'

const instance_abortController = new WeakMap<object, AbortController>()

/**
 * React类组件修饰器
 */
export function connect(connector: { [p: string]: typeof Service }, a?: any): any {
    const abortOnUnmount = typeof a === 'boolean' ? a : a?.abortOnUnmount
    return (target: any) => {
        return {
            [target.name]: class extends target {
                constructor(...a: any[]) {
                    super(...a)
                    if (abortOnUnmount) {
                        const abortController =  new AbortController()
                        instance_abortController.set(this, abortController)
                        for (const k in connector) {
                            this[k] = new connector[k]({signal: abortController.signal})
                        }
                    } else {
                        for (const k in connector) {
                            this[k] = new connector[k]()
                        }
                    }
                }

                componentWillUnmount() {
                    instance_abortController.get(this)?.abort()
                    instance_abortController.delete(this)
                    super.componentWillUnmount?.()
                }
            }[target.name]
        }
    }
}

export function useService<T extends Service>(service: new (config?: AjaxConfig) => T, a?: any): T {
    const abortOnUnmount = typeof a === 'boolean' ? a : a?.abortOnUnmount
    
    let abortController = useMemo(() => {
        return abortOnUnmount ? new AbortController() : void 0
    }, [abortOnUnmount])

    useEffect(() => () => {
        abortController?.abort()
    }, [])

    return useMemo(() => {
        return new service({signal: abortController?.signal})
    }, [abortController])
}