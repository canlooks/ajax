# @canlooks/ajax

A modular, TypeScript-first HTTP request library built on the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) with interceptor chains, progress tracking, timeout control, and a decorator-based module system.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Basic Usage](#basic-usage)
  - [GET Request](#get-request)
  - [POST Request](#post-request)
  - [Method Aliases](#method-aliases)
- [Configuration](#configuration)
  - [AjaxConfig Options](#ajaxconfig-options)
  - [Default Behavior](#default-behavior)
- [Response Handling](#response-handling)
  - [Response Types](#response-types)
  - [AjaxResponse Shape](#ajaxresponse-shape)
- [Error Handling](#error-handling)
  - [Error Hierarchy](#error-hierarchy)
  - [Error Properties](#error-properties)
  - [Debug Mode](#debug-mode)
- [Interceptors](#interceptors)
  - [Request Interceptors](#request-interceptors)
  - [Response Interceptors](#response-interceptors)
  - [Per-Request Interceptors](#per-request-interceptors)
- [Module System](#module-system)
  - [Creating a Service Module](#creating-a-service-module)
  - [Decorators](#decorators)
  - [Module-Level Interceptors](#module-level-interceptors)
  - [Extending Modules](#extending-modules)
- [Instance Pattern](#instance-pattern)
  - [Creating Instances](#creating-instances)
  - [Instance Inheritance](#instance-inheritance)
- [Upload & Download Progress](#upload--download-progress)
  - [Upload Progress](#upload-progress)
  - [Download Progress](#download-progress)
- [Timeout & Abort](#timeout--abort)
  - [Timeout](#timeout)
  - [External Abort Signal](#external-abort-signal)
- [URL & Params](#url--params)
  - [URL Merging](#url-merging)
  - [Query Parameters](#query-parameters)
- [TypeScript Support](#typescript-support)
  - [Generic Response Typing](#generic-response-typing)
  - [Import Paths](#import-paths)
- [Utility Functions](#utility-functions)
- [API Reference](#api-reference)
- [License](#license)

## Installation

```bash
npm install @canlooks/ajax
```

## Quick Start

```ts
import { ajax } from '@canlooks/ajax'

// GET request with type-safe response
const { result } = await ajax.get<User[]>('https://api.example.com/users')

// POST request with JSON body (auto-serialized)
const { result } = await ajax.post<Token>('https://api.example.com/login', {
  username: 'admin',
  password: 'secret'
})

// Full config
const { result, response, config } = await ajax({
  url: 'https://api.example.com/data',
  method: 'GET',
  params: { page: '1', limit: '10' },
  timeout: 5000,
  responseType: 'json'
})
```

## Basic Usage

### GET Request

```ts
import { ajax } from '@canlooks/ajax'

const { result } = await ajax.get('https://api.example.com/users', {
  params: { role: 'admin' },
  headers: { 'X-API-Key': 'abc123' }
})
```

### POST Request

Plain objects are automatically serialized to JSON. You can also pass `FormData`, `Blob`, `ArrayBuffer`, `URLSearchParams`, or `ReadableStream` directly.

```ts
// Auto JSON serialization
const { result } = await ajax.post('https://api.example.com/users', {
  name: 'John',
  email: 'john@example.com'
})

// FormData upload
const form = new FormData()
form.append('file', fileBlob)
const { result } = await ajax.post('https://api.example.com/upload', form)
```

### Method Aliases

| Category | Methods |
|---|---|
| Without body | `ajax.get()`, `ajax.delete()`, `ajax.head()`, `ajax.options()` |
| With body | `ajax.post()`, `ajax.put()`, `ajax.patch()` |

Signature for **without body** aliases:

```ts
ajax.get<T>(url: string, config?: AjaxConfig): Promise<AjaxResponse<T>>
```

Signature for **with body** aliases:

```ts
ajax.post<T>(url: string, body?: any, config?: AjaxConfig): Promise<AjaxResponse<T>>
```

## Configuration

### AjaxConfig Options

`AjaxConfig` extends the standard [`RequestInit`](https://developer.mozilla.org/en-US/docs/Web/API/RequestInit), adding these fields:

| Option | Type | Default | Description |
|---|---|---|---|
| `url` | `string \| URL` | — | Request URL. Required unless set via instance config. |
| `method` | `Method` | `'GET'` | HTTP method. |
| `params` | `string[][] \| Record<string,string> \| string \| URLSearchParams` | — | Query parameters appended to the URL. |
| `timeout` | `number` | `60000` (60s) | Request timeout in milliseconds. `0` disables timeout. Default is `undefined` (no timeout) when `onUploadProgress` or `onDownloadProgress` is set. |
| `responseType` | `'arrayBuffer' \| 'blob' \| 'formData' \| 'json' \| 'text' \| 'none'` | `'json'` | Auto-parses the response body. Set to `'none'` to skip parsing. Defaults to `'none'` when `onDownloadProgress` is set. |
| `onUploadProgress` | `ProgressCallback` | — | Callback for upload progress events. |
| `onDownloadProgress` | `ProgressCallback` | — | Callback for download progress events. |
| `onRequest` | `RequestInterceptorType` | — | Per-request request interceptor. |
| `onResponse` | `ResponseInterceptorType` | — | Per-request response interceptor. |

### Default Behavior

- **Timeout**: 60 seconds by default. Disabled (`undefined`) when progress callbacks are active.
- **Response type**: `'json'` by default. `'none'` when download progress is tracked.
- **Body serialization**: Plain objects are automatically `JSON.stringify()`'d. Other types (`FormData`, `Blob`, etc.) pass through unchanged.
- **Headers**: A `Content-Type: application/json` header is **not** auto-set. Set it explicitly if your server requires it.

## Response Handling

### Response Types

The `responseType` option controls how the response body is parsed:

| Value | Behavior |
|---|---|
| `'json'` (default) | Calls `response.json()` |
| `'text'` | Calls `response.text()` |
| `'blob'` | Calls `response.blob()` |
| `'arrayBuffer'` | Calls `response.arrayBuffer()` |
| `'formData'` | Calls `response.formData()` |
| `'none'` | Skips parsing. `result` will be `undefined`. |

### AjaxResponse Shape

Every request returns an `AjaxResponse<T>`:

```ts
interface AjaxResponse<T> {
  result: T           // Parsed response body
  response: Response  // Native Fetch Response object
  config: ResolvedConfig  // Final resolved config used for this request
}
```

```ts
const { result, response, config } = await ajax.get<User[]>('/users')

console.log(result)           // User[]
console.log(response.status)  // 200
console.log(response.headers) // Headers object
console.log(config.url)       // Resolved full URL
```

## Error Handling

### Error Hierarchy

All errors extend `AjaxError`, which extends the native `Error`:

```
AjaxError
├── NetworkError   — fetch() failed or response.ok is false
├── AbortError     — request was aborted
└── TimeoutError   — request exceeded timeout
```

### Error Properties

Each error carries:

```ts
class AjaxError extends Error {
  type: 'ajaxError' | 'networkError' | 'abortError' | 'timeoutError'
  cause: {
    config: ResolvedConfig   // The config used for the failed request
    response?: Response      // The Response object (if available)
    reason?: unknown         // Original external AbortSignal reason (if available)
  }
}
```

**Usage:**

```ts
import { ajax, AjaxError, NetworkError, TimeoutError, AbortError } from '@canlooks/ajax'

try {
  await ajax.get('https://api.example.com/data')
} catch (e) {
  if (e instanceof TimeoutError) {
    console.log('Request timed out after', e.cause.config.timeout, 'ms')
  } else if (e instanceof NetworkError) {
    console.log('Network error, status:', e.cause.response?.status)
  } else if (e instanceof AbortError) {
    console.log('Request was aborted')
  } else if (e instanceof AjaxError) {
    console.log('Ajax error:', e.message)
  }
}
```

### Debug Mode

Set the environment variable `CANLOOKS_AJAX_DEBUG=on` to print the full request config on every error:

```bash
CANLOOKS_AJAX_DEBUG=on node your-app.js
```

## Interceptors

Interceptors allow you to transform requests before they are sent and responses before they are returned.

### Request Interceptors

Request interceptors receive the resolved config and must return a config (or a Promise of one). They run **sequentially** in registration order.

```ts
import { ajax } from '@canlooks/ajax'

// Add a request interceptor
ajax.requestInterceptor.add(config => {
  // Add auth token to every request
  config.headers.set('Authorization', `Bearer ${getToken()}`)
  return config
})

// Remove an interceptor
ajax.requestInterceptor.delete(interceptorFn)
```

**Signature:**

```ts
type RequestInterceptorType = (config: ResolvedConfig) => ResolvedConfig | Promise<ResolvedConfig>
```

### Response Interceptors

Response interceptors receive `(response, error, config)`. If an interceptor returns a value, it becomes the new response and errors are cleared. If it throws, the error propagates. They run **sequentially**.

```ts
import { ajax } from '@canlooks/ajax'

// Add a response interceptor
ajax.responseInterceptor.add((response, error, config) => {
  if (error) {
    // Handle 401 globally
    if (error.cause?.response?.status === 401) {
      redirectToLogin()
      return
    }
    throw error // re-throw if not handled
  }
  // Unwrap the result from a wrapper
  if (response?.result?.code === 0) {
    return response.result.data
  }
  throw new Error(response?.result?.message ?? 'Unknown error')
})
```

**Signature:**

```ts
type ResponseInterceptorType = (response: any, error: any, config: ResolvedConfig) => any
```

- If `isFinalSuccess` is `true` after all interceptors run, the current `response` value is returned.
- If `isFinalSuccess` is `false`, the accumulated `error` is thrown.
- Returning `undefined` from an interceptor leaves the response untouched.
- A response interceptor can recover from an error by returning a value (sets `error = null`).

### Per-Request Interceptors

You can also attach interceptors to a single request via config:

```ts
const { result } = await ajax.get('/data', {
  onRequest: config => {
    config.headers.set('X-Request-Id', generateId())
    return config
  },
  onResponse: (response, error) => {
    if (error) throw error
    return response.result
  }
})
```

Per-request interceptors run **after** instance-level interceptors.

## Module System

The module system lets you organize API endpoints into service classes with shared configuration and interceptors.

### Creating a Service Module

Extend the `Service` class and use the `@Config` decorator to set shared defaults:

```ts
import { Service, Config } from '@canlooks/ajax'

@Config({
  url: 'https://api.example.com/v1',
  headers: { 'X-API-Key': 'abc123' },
  timeout: 10000
})
class ApiService extends Service {
  // GET /v1/users
  static getUsers() {
    return this.get<User[]>('/users')
  }

  // GET /v1/users/:id
  static getUser(id: string) {
    return this.get<User>(`/users/${id}`)
  }

  // POST /v1/users
  static createUser(data: CreateUserDto) {
    return this.post<User>('/users', data)
  }

  // PUT /v1/users/:id
  static updateUser(id: string, data: UpdateUserDto) {
    return this.put<User>(`/users/${id}`, data)
  }

  // DELETE /v1/users/:id
  static deleteUser(id: string) {
    return this.delete(`/users/${id}`)
  }
}

// Usage
const { result: users } = await ApiService.getUsers()
const { result: newUser } = await ApiService.createUser({ name: 'Jane' })
```

All HTTP method aliases are available as static methods: `this.get()`, `this.post()`, `this.put()`, `this.patch()`, `this.delete()`, `this.head()`, `this.options()`.

### Decorators

| Decorator | Target | Purpose |
|---|---|---|
| `@Config(config)` | Class | Sets default `AjaxConfig` for the service. URL paths are merged (see [URL Merging](#url-merging)). |
| `@RequestInterceptor` | Method | Marks a method as a request interceptor for this service. |
| `@ResponseInterceptor` | Method | Marks a method as a response interceptor for this service. |

### Module-Level Interceptors

Use `@RequestInterceptor` and `@ResponseInterceptor` decorators to define interceptors that only apply to a specific service module:

```ts
import { Service, Config, RequestInterceptor, ResponseInterceptor } from '@canlooks/ajax'

@Config({
  url: 'https://api.example.com/v1'
})
class ApiService extends Service {
  @RequestInterceptor
  static addAuth(config: ResolvedConfig) {
    config.headers.set('Authorization', `Bearer ${getToken()}`)
    return config
  }

  @ResponseInterceptor
  static unwrapResponse(response: any, error: any) {
    if (error) throw error
    if (response?.result?.code === 0) {
      return response.result.data
    }
    throw new Error(response?.result?.message ?? 'API Error')
  }

  // endpoints...
  static getUsers() {
    return this.get<User[]>('/users')
  }
}
```

The decorators also work as factory functions without arguments:

```ts
@RequestInterceptor()
static addAuth(config: ResolvedConfig) { ... }
```

Module-level interceptors are applied to the service's internal `ajax` instance and run **before** any per-request interceptors.

### Extending Modules

You can extend a service class to create more specific modules:

```ts
@Config({ url: 'https://api.example.com/v1' })
class BaseApi extends Service {
  @RequestInterceptor
  static addAuth(config: ResolvedConfig) {
    config.headers.set('Authorization', `Bearer ${getToken()}`)
    return config
  }
}

@Config({ url: '/users' })
class UserApi extends BaseApi {
  static getAll() {
    return this.get<User[]>('')  // resolves to /v1/users
  }
  static getById(id: string) {
    return this.get<User>(`/${id}`)  // resolves to /v1/users/:id
  }
}

@Config({ url: '/posts' })
class PostApi extends BaseApi {
  static getAll() {
    return this.get<Post[]>('')  // resolves to /v1/posts
  }
}
```

## Instance Pattern

### Creating Instances

The `ajax.create()` method produces a new instance that inherits the parent's config and interceptors:

```ts
import { ajax } from '@canlooks/ajax'

const api = ajax.create({
  url: 'https://api.example.com/v1',
  headers: { 'X-API-Key': 'abc123' }
})

api.requestInterceptor.add(config => {
  config.headers.set('Authorization', `Bearer ${getToken()}`)
  return config
})

// All requests from this instance use the shared config
const { result } = await api.get('/users')
```

Configuration passed to `create()` is normalized and copied at creation time. Mutable `Headers` and `URLSearchParams` inputs are cloned, so changing the source objects later does not affect the instance. The exposed `.config` is the creation snapshot for inspection; it is not an in-place API for changing instance defaults. Create another instance when different defaults are needed.

Abort signals are also captured at creation time, but inherited signals are not actively combined until a request starts. When several instance levels provide signals, `.config.signal` shows the most recently declared signal for inspection; the resolved request config receives the request-scoped combination of every inherited signal.

### Instance Inheritance

Child instances **copy** their parent's config and interceptor sets at creation time. Later source-object mutations and interceptor-set changes do not cross the instance boundary.

```ts
const parent = ajax.create({ url: 'https://api.example.com' })
const child = parent.create({ url: '/v2' })

// parent resolves to: https://api.example.com
// child resolves to:  https://api.example.com/v2
```

This is the foundation of the module system — each `Service` subclass gets its own isolated instance.

## Upload & Download Progress

### Upload Progress

Track upload progress for `Blob`, `FormData`, and `ArrayBuffer` bodies:

```ts
const { result } = await ajax.post('/upload', formData, {
  onUploadProgress: ({ loaded, total, chunk }) => {
    console.log(`Uploaded ${loaded} of ${total} bytes`)
    console.log(`Progress: ${Math.round((loaded / total) * 100)}%`)
  }
})
```

The library recursively finds all `Blob` objects in the body (including inside `FormData`, arrays, and nested objects), streams them, and reports cumulative progress.

### Download Progress

Track download progress for responses with a `Content-Length` header:

```ts
const { result } = await ajax.get('/large-file', {
  responseType: 'blob',
  onDownloadProgress: ({ loaded, total, chunk }) => {
    console.log(`Downloaded ${loaded} of ${total} bytes`)
  }
})

// result is a Blob
```

When `onDownloadProgress` is set:
- The response body is read as a `Uint8Array` stream
- `responseType` defaults to `'none'` — raw bytes are accumulated in `result`
- Supported `responseType` values with download progress: `'arrayBuffer'`, `'blob'`, or `'none'`
- If `Content-Length` is unavailable, `'arrayBuffer'` and `'blob'` fall back to native response parsing without progress events; `'none'` leaves the response body unconsumed

**Note:** When both upload and download progress are active, the default timeout is disabled (`undefined`). Set it explicitly if needed.

## Timeout & Abort

### Timeout

Default timeout is 60 seconds. Disable it by setting `timeout: 0`:

```ts
// 5 second timeout
await ajax.get('/data', { timeout: 5000 })

// No timeout
await ajax.get('/data', { timeout: 0 })
```

When a timeout fires, the request is aborted and a `TimeoutError` is thrown.

### External Abort Signal

Pass an `AbortSignal` to cancel a request externally:

```ts
const controller = new AbortController()

// Cancel after 2 seconds
setTimeout(() => controller.abort(), 2000)

try {
  await ajax.get('/data', { signal: controller.signal })
} catch (e) {
  console.log(e instanceof AbortError) // true
}
```

Instance-level, request-level, and internal timeout cancellation are combined automatically — aborting any active source cancels the request. Signal listeners used by compatibility fallbacks are owned by that request and are released after success, failure, cancellation, timeout, or an interceptor error.

## URL & Params

### URL Merging

When you set a `url` in an instance or service config, relative paths in subsequent requests are resolved against it:

```ts
const api = ajax.create({ url: 'https://api.example.com/v1' })

await api.get('/users')       // https://api.example.com/v1/users
await api.get('users')        // https://api.example.com/v1/users
await api.get('/users/123')   // https://api.example.com/v1/users/123
```

If a request URL starts with a protocol (`http://`, `https://`, `//`), it replaces the base URL entirely:

```ts
const api = ajax.create({ url: 'https://api.example.com/v1' })

await api.get('https://other.example.com/data')  // https://other.example.com/data
```

### Query Parameters

Pass `params` as an object, `URLSearchParams`, string, or array of pairs:

```ts
// Object
await ajax.get('/users', { params: { page: '1', sort: 'name' } })
// → /users?page=1&sort=name

// URLSearchParams
await ajax.get('/users', { params: new URLSearchParams({ page: '1' }) })

// String (appended as-is)
await ajax.get('/users', { params: 'page=1&sort=name' })

// Array of [key, value] pairs
await ajax.get('/users', { params: [['page', '1'], ['sort', 'name']] })
```

Params from instance/service config are merged with per-request params (request params take precedence for duplicate keys).

## TypeScript Support

### Generic Response Typing

All request methods are generic over the response type:

```ts
interface User {
  id: number
  name: string
  email: string
}

const { result } = await ajax.get<User[]>('/users')
// result: User[]

const { result: user } = await ajax.get<User>('/users/1')
// user: User

const { result } = await ajax.post<User>('/users', { name: 'Jane' })
// result: User
```

`Service` subclass methods also support generics:

```ts
class UserApi extends Service {
  static getAll() {
    return this.get<User[]>('/users')  // Promise<AjaxResponse<User[]>>
  }
}
```

### Import Paths

```ts
// ESM
import { ajax, Service, Config, RequestInterceptor, ResponseInterceptor } from '@canlooks/ajax'
import { AjaxError, NetworkError, TimeoutError, AbortError } from '@canlooks/ajax'
import type { AbortSignalScope, AjaxConfig, AjaxResponse, ConfigScope, ResolvedConfig } from '@canlooks/ajax'

// CJS
const { ajax, Service } = require('@canlooks/ajax')
```

## Utility Functions

The following utilities are exported and can be used directly:

| Function | Description |
|---|---|
| `mergeConfig(...configs)` | Merge multiple `AjaxConfig` objects into a `ResolvedConfig`; active multi-signal merges require native `AbortSignal.any`. |
| `mergeConfigScope(...configs)` | Merge configs and return `{config, cleanup}` for an explicitly disposable multi-signal fallback. |
| `mergeUrl(prev?, next?)` | Resolve a relative URL against a base URL. |
| `mergeParams(prev?, next?)` | Merge params into a new `URLSearchParams` instance. |
| `mergeHeaders(prev?, next?)` | Merge headers into a new `Headers` instance. |
| `mergeAbortSignal(prev?, next?)` | Merge two signals when native `AbortSignal.any` is available; without it, two distinct active signals require the scoped API. |
| `mergeAbortSignalScope(prev?, next?)` | Return `{signal, cleanup}` and safely support runtimes without `AbortSignal.any`. |
| `createAbortSignalScope(...signals)` | Create a disposable request-lifetime combination from any number of signals. |
| `bodyTransform(body)` | Auto `JSON.stringify` plain objects; pass other body types through. |
| `findBodyBlobs(body)` | Recursively find all `Blob` objects in a body (for progress tracking). |
| `catchCommonError(e, newError)` | Wrap a non-`AjaxError` into an `AjaxError`. |

When supporting a runtime without `AbortSignal.any`, use a scoped utility and always clean it up:

```ts
import { mergeAbortSignalScope } from '@canlooks/ajax'

const controllerA = new AbortController()
const controllerB = new AbortController()
const { signal, cleanup } = mergeAbortSignalScope(
  controllerA.signal,
  controllerB.signal
)

try {
  await fetch('/data', { signal })
} finally {
  cleanup()
}
```

`cleanup()` is idempotent and only detaches compatibility listeners; it does not abort the merged signal. Normal `ajax` and `Service` requests manage this scope automatically.

## API Reference

### `ajax` (named export)

The shared singleton instance. Import it by name with `import { ajax } from '@canlooks/ajax'`.

```ts
interface Ajax {
  // Invoke directly
  <T = any>(config?: AjaxConfig): Promise<AjaxResponse<T>>

  // Normalized creation snapshot (for inspection)
  config: AjaxConfig

  // Create a child instance
  create(config?: AjaxConfig): Ajax

  // Interceptor sets
  requestInterceptor: Set<RequestInterceptorType>
  responseInterceptor: Set<ResponseInterceptorType>

  // Method aliases — without body
  get<T = any>(url: string, config?: AjaxConfig): Promise<AjaxResponse<T>>
  delete<T = any>(url: string, config?: AjaxConfig): Promise<AjaxResponse<T>>
  head<T = any>(url: string, config?: AjaxConfig): Promise<AjaxResponse<T>>
  options<T = any>(url: string, config?: AjaxConfig): Promise<AjaxResponse<T>>

  // Method aliases — with body
  post<T = any>(url: string, body?: any, config?: AjaxConfig): Promise<AjaxResponse<T>>
  put<T = any>(url: string, body?: any, config?: AjaxConfig): Promise<AjaxResponse<T>>
  patch<T = any>(url: string, body?: any, config?: AjaxConfig): Promise<AjaxResponse<T>>
}
```

### `Service`

Base class for creating API service modules.

```ts
class Service {
  static ajax: Ajax
  static config: AjaxConfig
  static resolvedConfig: ResolvedConfig    // Config merged with parent

  static get<T>(url: string, config?: AjaxConfig): Promise<AjaxResponse<T>>
  static delete<T>(url: string, config?: AjaxConfig): Promise<AjaxResponse<T>>
  static head<T>(url: string, config?: AjaxConfig): Promise<AjaxResponse<T>>
  static options<T>(url: string, config?: AjaxConfig): Promise<AjaxResponse<T>>
  static post<T>(url: string, body?: any, config?: AjaxConfig): Promise<AjaxResponse<T>>
  static put<T>(url: string, body?: any, config?: AjaxConfig): Promise<AjaxResponse<T>>
  static patch<T>(url: string, body?: any, config?: AjaxConfig): Promise<AjaxResponse<T>>
}
```

### Decorators

```ts
function Config(config: AjaxConfig): ClassDecorator
const RequestInterceptor: MethodDecorator & (() => MethodDecorator)
const ResponseInterceptor: MethodDecorator & (() => MethodDecorator)
```

### Error Classes

```ts
class AjaxError extends Error { type, cause }
class NetworkError extends AjaxError { type: 'networkError' }
class AbortError extends AjaxError { type: 'abortError' }
class TimeoutError extends AjaxError { type: 'timeoutError' }
```

### Progress Types

```ts
type ProgressEvent = { loaded: number; total: number; chunk: Uint8Array }
type ProgressCallback = (event: ProgressEvent) => void
```

## License

MIT
