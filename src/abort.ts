import {Fn} from '..'

export class AbortToken {
    private callbacks = new Set<Fn>()

    on(callback: Fn) {
        this.callbacks.add(callback)
    }

    off(callback:Fn) {
        this.callbacks.delete(callback)
    }

    abort() {
        for (const fn of this.callbacks) {
            fn()
        }
        this.callbacks.clear()
    }
}