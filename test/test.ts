import {BeforeRequest, Module, Service} from '../src'
import {AjaxConfig} from '..'

@Module({
    url: 'https://vpp.cloud.ptswitch.com/api'
})
class MyService extends Service {
    @BeforeRequest()
    beforeRequest(config: AjaxConfig) {
        console.log(17, config)
        config.responseType = 'text'
        return config
    }
}

@Module({
    url: '/uims/user',
    timeout: 2000
})
class MyService1 extends MyService {
    login() {
        return this.post('/login', {
            username: 'admin',
            password: '123456'
        })
    }
}

const myService1 = new MyService1()
myService1.login().then(res => {
    console.log(30, res)
})