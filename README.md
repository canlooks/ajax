# @canlooks/ajax

## Install

> npm i @canlooks/ajax

## A quick example

### ajax(config)

```ts
import {ajax} from '@canlooks/ajax'

let pending = ajax({
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
type AjaxConfig<T> = {
    url?: string
    method?: Method
    headers?: Record<string, any>
    params?: any
    data?: any
    timeout?: number
    abortToken?: AbortToken
    auth?: {
        username: string
        password: string
    }
    responseType?: XMLHttpRequestResponseType | 'stream'
    withCredentials?: boolean
    validateStatus?: ((status: number) => boolean) | null | false
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

### Extender decorator

- @extender(url?: string)
- @extender(config?: AjaxConfig)

### example

```ts
import {AjaxAbort, AjaxConfig, AjaxError, extender, HttpService} from '@canlooks/ajax'

@extender({
    url: 'https://baidu.com'
})
export default class RootService extends HttpService {
    beforeRequest(config: AjaxConfig) {
        // To modify config before each request
        return config
    }

    beforeSuccess(res: any, config: AjaxConfig) {
        // Judge your own logic
        if (res.result === 'failed') {
            // Make this request throw error
            throw Error('no no no')
        }
        // Change return value
        return res.data
    }

    beforeFail(error: AjaxError<any>, config: AjaxConfig) {
        // Judge your own logic
        if (error.message === 'ignore') {
            // Make this request success and change return value
            return 'OK'
        }
        // Change error object
        throw Error('Another error')
    }

    onSuccess(data: any, config: AjaxConfig) {
        // Do something when each request success.
    }

    onFail(error: AjaxError<any>, config: AjaxConfig) {
        // Do something when each request fail.
    }
}
```

```ts
@extender('/search')
export default class ExampleService extends RootService {
    myFn() {
        // Request method will hang on "this", such as "get", "post"...
        return this.post('/test', {
            a: 572
        })
    }
}
```

```ts
new ExampleService().myFn()
    .then(res => {})
    .catch(e => {})
// The final request url is "https://baidu.com/search/test"
// and data is "{a: 572}"
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
// import {ExampleService, AnotherService} from 'somewhere'

@connect({
    myInjectedService: ExampleService,
    AnotherService
})
export default class Index extends Component {
    // Declare properties if you use typescript
    readonly myInjectedService!: ExampleService
    readonly AnotherService!: AnotherService

    someMethod = async () => {
        let res = await this.myInjectedService.myFn()
        let test = await this.AnotherService.anotherFn()
    }

    render() {
        return <></>
    }
}
```

### useService(ServiceClass)

```tsx
import {useService} from '@canlooks/ajax/react'
// import {ExampleService} from 'somewhere'

export default function Index() {
    let exampleService = useService(ExampleService)

    const someMethod = async () => {
        let res = await exampleService.myFn()
    }
    
    return <></>
}
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
        let {headers, method, url, data} = config
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
    let instance
    let promise = new Promise((success, error) => {
        let {headers, method, url, data} = config
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