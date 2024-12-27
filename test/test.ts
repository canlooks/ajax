import {BeforeRequest, Module, Service} from '../src'
import {AjaxConfig} from '..'

@Module({
    url: 'https://cn.bing.com'
})
class MyService extends Service {
    @BeforeRequest()
    beforeRequest(config: AjaxConfig) {
        console.log(17, config)
        config.responseType = 'text'
        return config
    }
}

class MyService1 extends MyService {
    test() {
        return this.get('/search')
    }
}

const myService1 = new MyService1()
myService1.test().then(res => {
    console.log(30, res)
})