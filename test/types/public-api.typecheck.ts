import * as Ajax from '../../src'

type User = {
    id: number
    name: string
}

const config: Ajax.AjaxConfig = {
    url: 'https://api.example.com/users',
    method: 'GET',
    params: {page: '1'},
    responseType: 'json',
    timeout: 1000
}

const request: Ajax.AjaxReturn<User[]> = Ajax.ajax<User[]>({...config})
const getRequest: Ajax.AjaxReturn<User> = Ajax.ajax.get<User>('/users/1')
const postRequest: Ajax.AjaxReturn<User> = Ajax.ajax.post<User>('/users', {name: 'Alice'})
const child: Ajax.Ajax = Ajax.ajax.create({url: 'https://api.example.com/v1'})
const resolved: Ajax.ResolvedConfig = Ajax.mergeConfig(config, {headers: {'x-test': 'yes'}})

const serviceRequest: Promise<Ajax.AjaxResponse<User>> = Ajax.Service.get<User>('/users/1')
const servicePostRequest: Ajax.AjaxReturn<User> = Ajax.Service.post<User>('/users', {name: 'Alice'})
const servicePatchRequest: Ajax.AjaxReturn<User> = Ajax.Service.patch<User>('/users/1', {name: 'Bob'})

const requestInterceptor: Ajax.RequestInterceptorType = requestConfig => requestConfig
const responseInterceptor: Ajax.ResponseInterceptorType = (response, error) => error ?? response
child.requestInterceptor.add(requestInterceptor)
child.responseInterceptor.add(responseInterceptor)

void request
void getRequest
void postRequest
void serviceRequest
void servicePostRequest
void servicePatchRequest
void resolved

// @ts-expect-error unsupported response parser
const badResponseType: Ajax.AjaxConfig = {responseType: 'xml'}
// @ts-expect-error unsupported HTTP method
const badMethod: Ajax.AjaxConfig = {method: 'CONNECT'}

void badResponseType
void badMethod
