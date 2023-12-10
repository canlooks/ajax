export interface AjaxConfig<T> extends RequestInit {
    url: string
    type?: 'json'
    data?: any
}

export async function ajax<T>(config: AjaxConfig<T>) {
    let {url, type, data, ...init} = config
    type ||= 'json'

    const timeoutController = new AbortController()

    setTimeout(() => {
        timeoutController.signal.addEventListener('abort', () => {
            console.log('timeout')
        })
        timeoutController.abort({
            a: 'timeout'
        })
    })

    try {
        const response = await fetch(url, {
            ...init,
            body: typeof data === 'undefined' || data === null ? void 0
                : type === 'json' ? JSON.stringify(data)
                    : data,
            signal: timeoutController.signal
        })
        return {
            data: await response.json(),
            config,
            get status() {
                return response.status
            },
            get statusText() {
                return response.statusText
            },
            get headers() {
                return response.headers
            }
        }
    } catch (e) {
        console.log(44, e)
        console.log(45, (e as DOMException).name === 'AbortError')
        console.log(46, timeoutController.signal.aborted)
    }
}