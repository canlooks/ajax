export class AbortToken {
    private callbacks = new Set<Fn>()

    on(callback: Fn) {
        this.callbacks.add(callback)
    }

    off(callback: Fn) {
        this.callbacks.delete(callback)
    }

    abort() {
        this.callbacks.forEach(fn => fn())
    }
}