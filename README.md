# @canlooks/ajax

## Install

> npm i @canlooks/ajax

## A quick example

### ajax(config)

```ts
import {ajax} from '@canlooks/ajax'

const pending = ajax({
    method: 'get',
    url: 'https://baidu.com'
})

// pending.abort()

pending.then(res => {
    console.log(res)
}).catch(e => {
    console.log(e)
})
```

### Alias

- ajax.get(url[, config])
- ajax.delete(url[, config])
- ajax.head(url[, config])
- ajax.options(url[, config])
- ajax.post(url[, data[, config]])
- ajax.put(url[, data[, config]])
- ajax.patch(url[, data[, config]])

### config

```ts
type AjaxConfig<T = any> = {
    url?: string
    method?: Method
    headers?: {[p: string]: any}
    params?: {[p: string | number]: any}
    data?: any
    timeout?: number
    abortToken?: AbortToken
    auth?: {
        username: string
        password: string
    }
    responseType?: XMLHttpRequestResponseType
    withCredentials?: boolean
    validateStatus?: ((status: number) => boolean) | boolean
    onSuccess?(data: ResponseBody<T>): void
    onTimeout?(error: TimeoutError): void
    onError?(error: AjaxError): void
    onComplete?(data: ResponseBody<T> | null, error: AjaxError | null): void
    onAbort?(error: AbortError): void
    onUploadProgress?: ProgressCallback
    onDownloadProgress?: ProgressCallback
}

type Method =
    'get' | 'GET' |
    'delete' | 'DELETE' |
    'head' | 'HEAD' |
    'options' | 'OPTIONS' |
    'post' | 'POST' |
    'put' | 'PUT' |
    'patch' | 'PATCH' |
    'purge' | 'PURGE' |
    'link' | 'LINK' |
    'unlink' | 'UNLINK'
```

### Response

```ts
type ResponseBody<T = any> = {
    result: T
    config: AjaxConfig<T>
    instance: XMLHttpRequest
    status: number
    statusText: string
    rawHeaders?: string
    headers: {[p: string]: number | string | string[]}
}
```

## Modularization

### Configure & Interceptors decorator

- @Configure(url?: string)
- @Configure(config?: AjaxConfig)
- @BeforeRequest((config: AjaxConfig) => AjaxConfig | Promise\<AjaxConfig>)
- @BeforeResponse((response: any, error: any, config: AjaxConfig) => any)

### example

```ts
import {AjaxAbort, AjaxConfig, AjaxError, BeforeRequest, BeforeResponse, Configure, OnFailed, OnSuccess, Service} from '@canlooks/ajax'

@Configure({
    url: 'https://baidu.com',
    headers: {
        'User-Agent': '@canlooks/ajax'
    }
})
@BeforeRequest((config: AjaxConfig) => {
    // To modify config before each request
    return config
})
@BeforeResponse((previousResponse: any, previousError: any, config: AjaxConfig) => {
    // Judge your own logic
    if (previousResponse.code === 'ERR') {
        // Make this request throw error
        throw Error('oh no')
    }
    // Change return value
    return res.data
})
class IndexService extends Service {
    @OnSuccess
    onSuccess(data: any, config: AjaxConfig) {
        // Do something when each request success.
    }

    @OnFailed
    OnFailed(error: AjaxError<any>, config: AjaxConfig) {
        // Do something when each request fail.
    }
}
```

```ts
@Configure('/search')
class ExampleService extends IndexService {
    myFn() {
        // Request method will hang on "this", such as "get", "post"...
        // The final request url is "https://baidu.com/search/test"
        return this.post('/test', {
            a: 572
        })
    }
}
```

## Use with React

When `componentWillUnmount`, every connected services will abort automatically.

### Connect decorator

```ts
@connect({
    [injectedPropertyName]: ServiceClass
})
```

```tsx
import {Component} from 'react'
import {connect} from '@canlooks/ajax/react'
import {ExampleService} from 'somewhere'

@connect({
    myInjectedService: ExampleService
})
export default class Index extends Component {
    // Declaring properties if you use typescript
    declare myInjectedService!: ExampleService

    someMethod = async () => {
        const res = await this.myInjectedService.myFn()
    }

    render() {
        return <></>
    }
}
```

### useService(ServiceClass)

```tsx
import {useService} from '@canlooks/ajax/react'
import {ExampleService} from 'somewhere'

export default function Index() {
    const exampleService = useService(ExampleService)

    const someMethod = async () => {
        const res = await exampleService.myFn()
    }
    
    return <></>
}
```

## Use with Vue

### useService(ServiceClass)

```html
<template>

</template>
<script lang="ts" setup>
import {useService} from '@canlooks/ajax/vue'
import {ExampleService} from 'somewhere'

const exampleService = useService(ExampleService)
</script>
```

---
## registerAdapter(adapter)

Set your own request adapter in modularization.  
Type of adapter

```ts
declare function registerAdapter(adapter: (config?: AjaxConfig) => any): void
```

For example, replace `@canlooks/ajax` with jquery
```ts
import $ from 'jquery'

registerAdapter((config: AjaxConfig = {}) => {
    return new Promise((success, error) => {
        const {headers, method, url, data} = config
        $.ajax({
            headers, method, url, data,
            success,
            error
        })
    })
})
```

For keeping `abort()`
```ts
import $ from 'jquery'

registerAdapter((config: AjaxConfig = {}) => {
    const instance
    const promise = new Promise((success, error) => {
        const {headers, method, url, data} = config
        instance = $.ajax({
            headers, method, url, data,
            success,
            error
        })
    })
    promise.abort = () => instance.abort()
    return promise
})
```