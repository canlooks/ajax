import React from 'react'
import {createRoot} from 'react-dom/client'
import {ajax, Config, Service, TimeoutError} from '../src'
import type {AjaxConfig, ResolvedConfig} from '../src'

@Config({
    url: 'https://baidu.com',
    timeout: 1
})
class TestService extends Service {
    static test() {
        return this.post('/test')
    }
}

function App() {
    const test1 = async () => {
        try {
            await TestService.test()
        } catch (e) {
            console.log(e instanceof TimeoutError)
        }
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
