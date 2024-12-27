import {BeforeRequest, Module, Service} from '../src'
import {AjaxConfig} from '..'

@Module({
    url: 'https://cn.bing.com'
})
class MyService extends Service {

}

@Module({
    url: '/search'
})
class MyService1 extends MyService {
    @BeforeRequest()
    beforeRequest(config: AjaxConfig) {
        config.responseType = 'text'
        return config
    }

    test() {
        return this.get('', {
            params: {
                q: '芒果tv'
            }
        })
    }
}

const myService1 = new MyService1()
myService1.test().then(res => {
    console.log(30, res)
})