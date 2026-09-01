export async function withoutAbortSignalAny<T>(run: () => T | Promise<T>): Promise<T> {
    const descriptor = Object.getOwnPropertyDescriptor(AbortSignal, 'any')
    Object.defineProperty(AbortSignal, 'any', {
        configurable: true,
        value: undefined
    })

    try {
        return await run()
    } finally {
        if (descriptor) {
            Object.defineProperty(AbortSignal, 'any', descriptor)
        } else {
            delete (AbortSignal as any).any
        }
    }
}
