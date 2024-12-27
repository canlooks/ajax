import {AjaxConfig, Service} from '..'

export function useService<T extends Service>(service: new (config?: AjaxConfig) => T): T