import {AjaxConfig} from '..'
import {onUnmounted} from 'vue'

export function useService<T>(service: new (config?: AjaxConfig) => T): T {
    const abortController = new AbortController()
    onUnmounted(() => abortController.abort())
    return new service({signal: abortController.signal})
}