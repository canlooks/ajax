import {Service} from './'

declare function connect(connector: Record<string, typeof Service>): <T>(target: T, context: ClassDecoratorContext) => T

export function useService<T>(service: { new(): T }): T