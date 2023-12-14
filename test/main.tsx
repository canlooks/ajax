import React, {useState} from 'react'
import {createRoot} from 'react-dom/client'
import {useService} from '../src/react'
import {BeforeRequest, Configure, Service, ajax, onComplete} from '../src'

const testToken = 'dc773c8e-bae7-48a9-96ed-731a05185ecb'
const pdfUrl = 'https://oss.queeny.cn/7e8613bd-69a4-42e1-8918-2f5edb75f4ad/%E5%A4%A9%E5%A4%A9%E5%BF%AB%E5%85%85%E7%9B%96%E7%AB%A0%E5%9B%BE%E7%BA%B8%EF%BC%88%E7%94%9F%E4%BA%A7%EF%BC%89.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ypejadz7g1ms0KBKl1zo%2F20231214%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20231214T060916Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Signature=8d8b1f088603b475937fd3a30501cc41f07a59613fee498085c8281072c032f6'

function App() {
    const [src, setSrc] = useState('')

    const onClick = async () => {
        const {result} = await ajax({
            url: 'https://gateway.queeny.cn/login',
            method: 'POST',
            data: {
                account: '@广西天天快充',
                password: '12345678'
            }
        })
        console.log(21, result)
    }

    return (
        <>
            <h1>This is test page for @canlooks/ajax</h1>
            <button onClick={onClick}>button</button>
            <iframe src={src} />
        </>
    )
}

createRoot(document.getElementById('app')!).render(<App />)