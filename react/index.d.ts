import {Service} from '../'

export function connect(connector: Record<string, typeof Service>): <T>(target: T) => T

export function useService<T>(service: { new(): T }): T