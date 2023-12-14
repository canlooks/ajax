import {AjaxConfig} from '..'

export function useService<T>(service: new (config?: AjaxConfig) => T): T