import {expect} from 'vitest'

export function mockJson(data: unknown, init: ResponseInit = {}) {
    fetchMock.mockResponseOnce(JSON.stringify(data), {
        status: init.status ?? 200,
        statusText: init.statusText,
        headers: {
            'content-type': 'application/json',
            ...Object.fromEntries(new Headers(init.headers))
        }
    })
}

export function mockText(body: string, init: ResponseInit = {}) {
    fetchMock.mockResponseOnce(body, {
        status: init.status,
        statusText: init.statusText,
        headers: Object.fromEntries(new Headers(init.headers))
    })
}

export function fetchCall(index = -1) {
    const calls = fetchMock.mock.calls
    const resolvedIndex = index < 0 ? calls.length + index : index
    const call = calls[resolvedIndex]
    expect(call, `fetch call at index ${index}`).toBeDefined()
    return {
        input: call![0] as RequestInfo | URL,
        init: call![1] as RequestInit | undefined
    }
}

export function fetchUrl(index = -1) {
    const {input} = fetchCall(index)
    return typeof input === 'string'
        ? input
        : input instanceof URL
            ? input.href
            : input.url
}

export function fetchInit(index = -1) {
    return fetchCall(index).init ?? {}
}

export function mockPendingUntilAbort() {
    fetchMock.mockImplementationOnce((_input, init) => new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal
        if (signal?.aborted) {
            reject(signal.reason)
            return
        }
        signal?.addEventListener('abort', () => reject(signal.reason), {once: true})
    }))
}

export function streamResponse(chunks: Uint8Array[], init: ResponseInit = {}) {
    return new Response(new ReadableStream<Uint8Array>({
        start(controller) {
            for (const chunk of chunks) {
                controller.enqueue(chunk)
            }
            controller.close()
        }
    }), init)
}
