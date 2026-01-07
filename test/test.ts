import {Service, Config, RequestInterceptor} from '../src/module'
import {ResolvedConfig} from '../index'

@Config({
    url: '/root',
    headers: {
        'content-type': 'application/json'
    }
})
class RootService extends Service {
    @RequestInterceptor
    static fn1(config: ResolvedConfig) {
        config.url += '/root'
    }
}

@Config({
    url: '/test'
})
class TestService extends RootService {
    @RequestInterceptor
    static fn2(config: ResolvedConfig) {
        config.url += '/test'
    }
}

TestService.get('/end')