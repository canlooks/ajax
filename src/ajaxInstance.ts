export class AjaxInstance<T = any> extends Promise<T> {
    instance!: XMLHttpRequest | any

    abort() {
        this.instance.abort()
    }
}