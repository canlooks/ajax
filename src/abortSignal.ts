import type {AbortSignalScope} from './types.js'

const noop = () => undefined

/**
 * 在一个明确的生命周期内组合多个取消信号。
 * cleanup 必须在生命周期结束时调用；调用是幂等的，且不会主动中止组合信号。
 */
export function createAbortSignalScope(
    ...inputs: (AbortSignal | null | undefined)[]
): AbortSignalScope {
    const signals = [...new Set(inputs.filter((signal): signal is AbortSignal => Boolean(signal)))]

    if (!signals.length) {
        return {
            signal: inputs.length ? inputs[inputs.length - 1] : void 0,
            cleanup: noop
        }
    }

    if (signals.length === 1) {
        return {signal: signals[0], cleanup: noop}
    }

    const alreadyAborted = signals.find(signal => signal.aborted)
    if (alreadyAborted) {
        const controller = new AbortController()
        controller.abort(alreadyAborted.reason)
        return {signal: controller.signal, cleanup: noop}
    }

    if (typeof AbortSignal.any === 'function') {
        return {signal: AbortSignal.any(signals), cleanup: noop}
    }

    const controller = new AbortController()
    const listeners = new Map<AbortSignal, () => void>()
    let active = true

    const cleanup = () => {
        if (!active) {
            return
        }
        active = false
        for (const [signal, listener] of listeners) {
            signal.removeEventListener('abort', listener)
        }
        listeners.clear()
    }

    const abortFrom = (source: AbortSignal) => {
        if (!active) {
            return
        }
        cleanup()
        controller.abort(source.reason)
    }

    try {
        for (const signal of signals) {
            const listener = () => abortFrom(signal)
            signal.addEventListener('abort', listener, {once: true})
            listeners.set(signal, listener)

            // 防止 signal 在初始检查与 listener 注册之间变为 aborted。
            if (signal.aborted) {
                abortFrom(signal)
                break
            }
        }
    } catch (error) {
        cleanup()
        throw error
    }

    return {signal: controller.signal, cleanup}
}

/**
 * mergeAbortSignal 的可清理版本，适用于缺少 AbortSignal.any 的运行时。
 */
export function mergeAbortSignalScope(
    prev?: AbortSignal | null,
    next?: AbortSignal | null
): AbortSignalScope {
    return createAbortSignalScope(prev, next)
}
