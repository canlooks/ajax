import type {AjaxConfig, ConfigScope, ResolvedConfig} from './types.js'
import {createAbortSignalScope} from './abortSignal.js'
import {
    collectAbortSignals,
    mergeConfigFields
} from './config.js'
import {AjaxError} from './error.js'

export {mergeHeaders, mergeParams, mergeUrl} from './config.js'

export function bodyTransform(body: BodyInit | null | undefined) {
    if (typeof body === 'object' && body !== null) {
        if (!(body instanceof ReadableStream)
            && !(body instanceof Blob)
            && !(body instanceof ArrayBuffer)
            && !(body instanceof FormData)
            && !(body instanceof URLSearchParams)
        ) {
            try {
                return JSON.stringify(body)
            } catch (e) {
            }
        }
    }
    return body
}

/**
 * 查找请求体中的Blob对象
 * @param body
 */
export async function findBodyBlobs(body: any) {
    const blobs: Blob[] = []
    const recurse = async (obj: any) => {
        if (obj instanceof ReadableStream) {
            blobs.push(await new Response(obj).blob())
            return
        }
        if (obj instanceof Blob) {
            blobs.push(obj)
            return
        }
        if (obj instanceof ArrayBuffer) {
            blobs.push(new Blob([obj]))
            return
        }
        if (Array.isArray(obj)) {
            await Promise.all(obj.map(recurse))
            return
        }
        if (typeof obj === 'object' && obj !== null) {
            obj instanceof FormData
                ? await recurse([...obj.values()])
                : await recurse(Object.values(obj))
        }
    }
    await recurse(body)
    return blobs
}

/**
 * 合并配置
 * @param config
 */
export function mergeConfig(...config: (AjaxConfig | undefined)[]): ResolvedConfig {
    const result = mergeConfigFields(...config)
    const signals = collectAbortSignals(...config)
    result.signal = mergeAbortSignalsWithoutLifecycle(signals)
    return result
}

/**
 * 返回带显式 cleanup 的配置合并结果，适用于缺少 AbortSignal.any 的运行时。
 */
export function mergeConfigScope(...config: (AjaxConfig | undefined)[]): ConfigScope {
    const result = mergeConfigFields(...config)
    const scope = createAbortSignalScope(...collectAbortSignals(...config))
    result.signal = scope.signal
    return {config: result, cleanup: scope.cleanup}
}

/**
 * 合并两个 signal。缺少原生 AbortSignal.any 时，请改用 mergeAbortSignalScope。
 * @deprecated 对需要兼容旧运行时的多 signal 场景，请使用带 cleanup 的 scoped API。
 */
export function mergeAbortSignal(prev?: AbortSignal | null, next?: AbortSignal | null): AbortSignal | null | undefined {
    if (!prev) {
        return next
    }
    if (!next) {
        return prev
    }
    return mergeAbortSignalsWithoutLifecycle([prev, next])
}

function mergeAbortSignalsWithoutLifecycle(signals: AbortSignal[]): AbortSignal | undefined {
    const uniqueSignals = [...new Set(signals)]
    if (!uniqueSignals.length) {
        return void 0
    }
    if (uniqueSignals.length === 1) {
        return uniqueSignals[0]
    }

    const alreadyAborted = uniqueSignals.find(signal => signal.aborted)
    if (alreadyAborted) {
        const controller = new AbortController()
        controller.abort(alreadyAborted.reason)
        return controller.signal
    }

    if (typeof AbortSignal.any === 'function') {
        return AbortSignal.any(uniqueSignals)
    }

    throw new TypeError(
        'AbortSignal.any is unavailable; use mergeAbortSignalScope() or mergeConfigScope() and call cleanup() in finally'
    )
}

export function catchCommonError(e: any, newError: (message?: string) => any) {
    return e instanceof AjaxError
        ? e
        : newError(e instanceof Error ? e.message : String(e))
}
