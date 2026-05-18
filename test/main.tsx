import React from 'react'
import {createRoot} from 'react-dom/client'
import {ajax, Config, Service} from '../src'
import {AjaxConfig, ResolvedConfig} from '../index'

@Config({
    url: 'https://baidu.com'
})
class TestService extends Service {
    static test() {
        return this.post('/test')
    }
}

function App() {
    const test1 = () => {
        TestService.test()
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