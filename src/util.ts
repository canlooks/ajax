/**
 * 查找请求体中的Blob对象
 * @param body
 */
export function findBodyFiles(body: any): Blob | undefined {
    if (body instanceof Blob) {
        return body
    }
    if (typeof body === 'object' && body !== null) {
        for (const k in body) {
            const file = findBodyFiles(body[k])
            if (file) {
                return file
            }
        }
    }
}