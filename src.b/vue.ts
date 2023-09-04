import {AjaxConfig} from '../index'
import {AbortToken} from './abort'
import {onUnmounted} from 'vue'

export function useService<T>(service: { new(config?: AjaxConfig): T }): T {
    const abortToken = new AbortToken()
    onUnmounted(() => abortToken.abort())
    return new service({abortToken})
}