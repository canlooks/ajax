import {ClientRequest} from 'http'
import {AjaxConfig, Method} from '../index'

export class AjaxInstance<T> extends Promise<T> {
    instance!: XMLHttpRequest | ClientRequest

    abort() {
        let instance: any = this.instance
        if (instance) {
            instance.destroy ? instance.destroy() : instance.abort()
        }
    }
}

export const {ajax} = typeof XMLHttpRequest !== 'undefined' ?
    require('./xhr') :
    require('./http')

ajax.get = aliasWithoutData('get')
ajax.delete = aliasWithoutData('delete')
ajax.head = aliasWithoutData('head')
ajax.options = aliasWithoutData('options')

function aliasWithoutData(method: Method) {
    // @ts-ignore
    return <T = any>(url: string, config?: AjaxConfig<T>) => ajax<T>({...config, method, url})
}

ajax.post = aliasWithData('post')
ajax.put = aliasWithData('put')
ajax.patch = aliasWithData('patch')

function aliasWithData(method: Method) {
    // @ts-ignore
    return <T = any>(url: string, data: any, config?: AjaxConfig<T>) => ajax<T>({...config, method, url, data})
}