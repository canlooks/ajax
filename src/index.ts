import {AjaxConfig, Method} from '../index'

import {ajax} from './core'

;(ajax as any).get = aliasWithoutData('get')
;(ajax as any).delete = aliasWithoutData('delete')
;(ajax as any).head = aliasWithoutData('head')
;(ajax as any).options = aliasWithoutData('options')

function aliasWithoutData(method: Method) {
    // @ts-ignore
    return <T = any>(url: string, config?: AjaxConfig<T>) => ajax<T>({...config, method, url})
}

;(ajax as any).post = aliasWithData('post')
;(ajax as any).put = aliasWithData('put')
;(ajax as any).patch = aliasWithData('patch')

function aliasWithData(method: Method) {
    // @ts-ignore
    return <T = any>(url: string, data: any, config?: AjaxConfig<T>) => ajax<T>({...config, method, url, data})
}