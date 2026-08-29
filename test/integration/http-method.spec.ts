import {afterAll, beforeAll, describe, expect, it} from 'vitest'
import {createServer, type Server} from 'node:http'
import {ajax} from '../../src/ajaxInstance'
import {AbortError} from '../../src/error'

let server: Server
let endpoint: string
let receivedRequests = 0

beforeAll(async () => {
    server = createServer(async (request, response) => {
        receivedRequests += 1
        const chunks: Buffer[] = []
        for await (const chunk of request) {
            chunks.push(Buffer.from(chunk))
        }
        response.setHeader('content-type', 'application/json')
        response.end(JSON.stringify({
            method: request.method,
            body: Buffer.concat(chunks).toString('utf8')
        }))
    })

    await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(0, '127.0.0.1', () => {
            server.off('error', reject)
            resolve()
        })
    })

    const address = server.address()
    if (!address || typeof address === 'string') {
        throw new Error('HTTP test server did not expose a TCP address')
    }
    endpoint = `http://127.0.0.1:${address.port}/resource`
})

afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve())
    })
})

describe('native HTTP transport', () => {
    it('sends ajax.patch as uppercase PATCH to a strict HTTP server', async () => {
        const {result, config} = await ajax.patch<{method: string, body: string}>(
            endpoint,
            {name: 'updated'},
            {timeout: 2000, headers: {'content-type': 'application/json'}}
        )

        expect(result).toStrictEqual({
            method: 'PATCH',
            body: JSON.stringify({name: 'updated'})
        })
        expect(config.method).toBe('PATCH')
    })

    it('does not reach the HTTP server when the input signal is already aborted', async () => {
        const requestsBeforeCancellation = receivedRequests
        const controller = new AbortController()
        controller.abort(new Error('cancel before request'))

        await expect(ajax.get(endpoint, {
            signal: controller.signal,
            timeout: 0
        })).rejects.toBeInstanceOf(AbortError)

        await new Promise(resolve => setTimeout(resolve, 20))
        expect(receivedRequests).toBe(requestsBeforeCancellation)
    })
})
