import React from 'react'
import {createRoot} from 'react-dom/client'
import {ajax, BeforeRequest, BeforeResponse, Module, Service} from '../src'
import {AjaxConfig, ResolvedConfig} from '../index'
import {useService} from '../src/react'

@Module({
    url: 'https://vpp.cloud.ptswitch.com/api'
})
class RootService extends Service {
    @BeforeRequest()
    b1(config: ResolvedConfig) {
        console.log('RootService', this)
        config.headers.set('token', '123456')
        return config
    }

    @BeforeResponse()
    beforeResponse(result: any, error: any, config: any) {
        console.log('beforeResponse', result, error, config)
        return result
    }
}

@Module({
    url: '/uims/user',
    timeout: 2000
})
class UserService extends RootService {
    @BeforeRequest()
    b2(config: AjaxConfig) {
        console.log('UserService')
        return config
    }

    login() {
        return this.post('/login', {
            username: 'admin',
            password: '123456'
        })
    }
}

@Module({
    url: '/uims/user',
    timeout: 2000
})
class TestService extends RootService {
    @BeforeRequest()
    b3(config: ResolvedConfig) {
        console.log('TestService', config.headers.get('token'))
        return config
    }

    login() {
        return this.post('/login', {
            username: 'admin',
            password: '123456'
        })
    }
}

function App() {
    // const userService = useService(UserService)
    const testService = useService(TestService)

    const login = () => {
        testService.login()
    }

    return (
        <>
            <button onClick={login}>button</button>
        </>
    )
}

createRoot(document.getElementById('app')!).render(<App />)