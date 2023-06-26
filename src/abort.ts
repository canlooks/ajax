export class AbortToken {
    private callbacks = new Set<(...a: any[]) => any>()

    on(callback: (...a: any[]) => any) {
        this.callbacks.add(callback)
    }

    off(callback: (...a: any[]) => any) {
        this.callbacks.delete(callback)
    }

    abort() {
        for (const fn of this.callbacks) {
            fn()
        }
    }
}