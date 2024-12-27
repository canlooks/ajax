import {AjaxConfig, Service} from '..'

export type ServiceOptions = {
    /** 组件卸载时中断请求，默认为`false` */
    abortOnUnmount?: boolean
}

export function connect(connector: {[p: string]: typeof Service}, abortOnUnmount?: boolean): <T>(target: T) => T
export function connect(connector: {[p: string]: typeof Service}, options?: ServiceOptions): <T>(target: T) => T

export function useService<T extends Service>(service: new (config?: AjaxConfig) => T, abortOnUnmount?: boolean): T
export function useService<T extends Service>(service: new (config?: AjaxConfig) => T, options?: ServiceOptions): T