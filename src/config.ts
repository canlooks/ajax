import type {AjaxConfig, ResolvedConfig} from './types.js'

export type InstanceDefaults = {
    config: AjaxConfig
    signals: readonly AbortSignal[]
}

/**
 * 合并配置字段，但不创建任何 AbortSignal listener。
 */
export function mergeConfigFields(...configs: (AjaxConfig | undefined)[]): ResolvedConfig {
    if (configs.length < 1) {
        throw Error(`No config passed to "mergeConfig" method`)
    }

    const merge = (prev: AjaxConfig | undefined, next: AjaxConfig | undefined): ResolvedConfig => ({
        ...prev,
        ...next,
        url: mergeUrl(prev?.url, next?.url),
        params: mergeParams(prev?.params, next?.params),
        headers: mergeHeaders(prev?.headers, next?.headers),
        // 实例快照仅展示最后声明的有效 signal；完整来源由 InstanceDefaults 保存。
        signal: next?.signal || prev?.signal
    })

    if (configs.length === 1) {
        return merge(configs[0], void 0)
    }
    return configs.reduce(merge) as ResolvedConfig
}

export function collectAbortSignals(...configs: (AjaxConfig | undefined)[]): AbortSignal[] {
    const signals: AbortSignal[] = []
    const seen = new Set<AbortSignal>()

    for (const config of configs) {
        const signal = config?.signal
        if (signal && !seen.has(signal)) {
            seen.add(signal)
            signals.push(signal)
        }
    }
    return signals
}

export function createInstanceDefaults(
    parent: InstanceDefaults,
    next?: AjaxConfig
): InstanceDefaults {
    const signals = collectAbortSignals(
        ...parent.signals.map(signal => ({signal})),
        next
    )
    return {
        config: mergeConfigFields(parent.config, next),
        signals
    }
}

export function resolveRequestConfig(defaults: InstanceDefaults, next?: AjaxConfig) {
    return {
        config: mergeConfigFields(defaults.config, next),
        signals: collectAbortSignals(
            ...defaults.signals.map(signal => ({signal})),
            next
        )
    }
}

export function mergeUrl(prev?: string | URL, next?: string | URL): string | undefined {
    if (prev instanceof URL) {
        prev = prev.href
    }
    if (next instanceof URL) {
        next = next.href
    }
    if (!prev) {
        return next
    }
    if (!next) {
        return prev
    }
    // next开头带协议，则抛弃prev，直接使用next
    if (/^([a-z]+:)?\/\//i.test(next)) {
        return next
    }
    // prev去掉末尾的'/'，next去掉开头的'/'
    prev = prev.replace(/\/+$/, '')
    next = next.replace(/^\/+/, '')

    return `${prev}/${next}`
}

export function mergeParams(prev: AjaxConfig['params'], next: AjaxConfig['params']): URLSearchParams {
    return mergeParamsOrHeaders(URLSearchParams, prev, next)
}

export function mergeHeaders(prev?: HeadersInit, next?: HeadersInit): Headers {
    return mergeParamsOrHeaders(Headers, prev, next)
}

function mergeParamsOrHeaders(objectClass: any, prev?: any, next?: any) {
    // prev无论如何都要new，避免直接修改prev
    const obj = new objectClass(prev)
    if (!next) {
        return obj
    }
    // next也始终复制，避免标准可变对象泄漏到配置快照中
    const nextObject = new objectClass(next)
    if (!prev) {
        return nextObject
    }
    for (const [name, value] of nextObject) {
        obj.set(name, value)
    }
    return obj
}
