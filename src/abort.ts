import {Cb} from '../index'

export class AbortToken {
    private callbacks = new Set<Cb>()

    on(callback: Cb) {
        this.callbacks.add(callback)
    }

    off(callback: Cb) {
        this.callbacks.delete(callback)
    }

    abort() {
        this.callbacks.forEach(fn => fn())
    }
}