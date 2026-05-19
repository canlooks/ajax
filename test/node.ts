import {Config, Service, TimeoutError} from '../src'

@Config({
    url: 'https://baidu.com',
    timeout: 1
})
class TestService extends Service {
    static test() {
        return this.get('')
    }
}

(async () => {
    try {
        const res = await TestService.test()
        console.log(15, res)
    } catch (e) {
        console.log(e instanceof TimeoutError)
    }
})()