import {ComponentClass} from 'react'
import {HttpService} from '../dist'

export function connect(connector: Record<string, typeof HttpService>): <T extends ComponentClass<any>>(target: T) => T

export function useService<T extends HttpService>(service: { new(): T }): T