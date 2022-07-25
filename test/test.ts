import {AbortToken, extender, HttpService} from '../src'

// @ts-ignore
@extender({
    url: 'https://baidu.com/',
    headers: {
        b: '2'
    }
})
class AService extends HttpService {
    testFn() {
        console.log(11, this)
    }
}

// @ts-ignore
@extender({
    url: '/search',
    headers: {
        a: '1'
    }
})
class BService extends AService {
    testFn() {
        console.log(22, this)
    }
}

// @ts-ignore
@extender({
    url: '/query',
    headers: {
        c: '33'
    }
})
class CService extends AService {
    testFn() {
        console.log(35, this)
    }
}

let bs = new BService()
bs.mergedConfig.abortToken = new AbortToken()
bs.testFn()

let cs = new CService()
cs.testFn()

let as = new AService()
as.testFn()