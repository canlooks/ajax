import {AjaxConfig} from '..'
import {onUnmounted} from 'vue'
import {Service} from './module'

export function useService<T extends Service>(service: new (config?: AjaxConfig) => T, a?: any): T {
    const abortOnUnmount = typeof a === 'boolean' ? a : a?.abortOnUnmount
    if (abortOnUnmount) {
        const abortController = new AbortController()
        onUnmounted(() => abortController.abort())
        return new service({signal: abortController.signal})
    }
    return new service()
}