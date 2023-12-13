import {Configure, BeforeRequest, Service, onComplete} from '../src'

@Configure({
    url: 'https://baidu.com',
    headers: {
        'test': 'abc'
    }
})
@BeforeRequest(function aa(c) {
    return c
})
class IndexService extends Service {

}

@Configure({
    url: '/search',
    headers: {
        'test2': 'def'
    }
})
@BeforeRequest(function bb(c) {
    return c
})
class SubService extends IndexService {
    @onComplete
    static myMethod() {

    }
}

@Configure('/test')
@BeforeRequest(function cc(c) {
    return c
})
class TestService extends IndexService {
    @onComplete
    static myMethod2() {

    }
}

TestService.post('/a')
SubService.post('/a')
TestService.post('/a')
SubService.post('/a')


// console.log(TestService.requestInterceptors)
// console.log(SubService.requestInterceptors)