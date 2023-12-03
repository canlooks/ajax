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
    headers?: Record<string, any>
    params?: Record<string | number, any>
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
    onSuccess?(data: ResponseType<T>): void
    onTimeout?(error: AjaxTimeout): void
    onError?(error: AjaxError<T>): void
    onComplete?(data: ResponseType<T> | undefined, error: AjaxError<T> | undefined): void
    onAbort?(error: AjaxAbort): void
    onUploadProgress?: ProgressCallback
    onDownloadProgress?: ProgressCallback
    maxRedirects?: number
    maxBodyLength?: number
    maxContentLength?: number
    decompress?: boolean
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
type ResponseType<T> = {
    data: T
    config: AjaxConfig<T>
    instance: XMLHttpRequest | ClientRequest
    status: number
    statusText: string
    rawHeaders?: string
    headers: Record<string, number | string | string[]>
}
```

## Modularization

### Configure & Interceptors decorator

- @Configure(url?: string)
- @Configure(config?: AjaxConfig)

### example

```ts
import {AjaxAbort, AjaxConfig, AjaxError, BeforeFail, BeforeRequest, BeforeSuccess, Configure, OnAbort, OnFail, OnSuccess, Service} from '@canlooks/ajax'

@Configure({
    url: 'https://baidu.com',
    headers: {
        'User-Agent': '@canlooks/ajax'
    }
})
class IndexService extends Service {
    @BeforeRequest
    beforeRequest(config: AjaxConfig) {
        // To modify config before each request
        return config
    }

    @BeforeSuccess
    beforeSuccess(res: any, config: AjaxConfig) {
        // Judge your own logic
        if (res.result === 'failed') {
            // Make this request throw error
            throw Error('oh no')
        }
        // Change return value
        return res.data
    }

    @BeforeFail
    beforeFail(error: AjaxError<any>, config: AjaxConfig) {
        // Judge your own logic
        if (error.message === 'ignore') {
            // Make this request success and change return value
            return 'OK'
        }
        // Change error object
        throw Error('Another error')
    }

    @OnSuccess
    onSuccess(data: any, config: AjaxConfig) {
        // Do something when each request success.
    }

    @OnFail
    onFail(error: AjaxError<any>, config: AjaxConfig) {
        // Do something when each request fail.
    }

    @OnAbort
    onAbort(error: AjaxAbort<any>, config: AjaxConfig) {
        // Do something when each request fail.
    }
}
```

```ts
@Configure('/search')
class ExampleService extends IndexService {
    myFn() {
        // Request method will hang on "this", such as "get", "post"...
        return this.post('/test', {
            a: 572
        })
    }
}
```

`The final request url is "https://baidu.com/search/test"`

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
    readonly myInjectedService!: ExampleService

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

const exampleService = useService(ExampleService)
</script>
```

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