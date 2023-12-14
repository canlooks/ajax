import {Service} from '..'

export function connect(connector: {[p: string]: typeof Service}): <T>(target: T) => T

export function useService<T>(service: new (config?: AjaxConfig) => T): T