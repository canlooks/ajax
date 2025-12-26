import React from 'react'
import {createRoot} from 'react-dom/client'
import {ajax, BeforeRequest, BeforeResponse, Module, Service} from '../src'
import {AjaxConfig, ResolvedConfig} from '../index'
import {useService} from '../src/react'

@Module({
    url: 'https://baidu.com'
})
class TestService extends Service {
    test() {
        return this.post('/test')
    }
}

function App() {
    // const userService = useService(UserService)
    const testService = useService(TestService)

    const test1 = () => {
        testService.test()
    }

    const test2 = async () => {
        const res = await fetch('https://baidu.com/test')
    }

    return (
        <>
            <button onClick={test1}>button1</button>
            <button onClick={test2}>button2</button>
        </>
    )
}

createRoot(document.getElementById('app')!).render(<App />)