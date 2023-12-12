import React, {useState} from 'react'
import {createRoot} from 'react-dom/client'
import {name} from '../package.json'
import {ajax} from '../src/core'
import {AjaxError} from '../src/error'

const testToken = 'dc773c8e-bae7-48a9-96ed-731a05185ecb'

class TestService {
    testFn() {

    }
}

const testService = new TestService()

function App() {
    const login = async () => {
        const res = await ajax({
            url: 'https://gateway.queeny.cn/login',
            method: 'POST',
            data: {
                account: '@广西海博出租汽车有限公司',
                password: '12345678'
            }
        })
        console.log(18, res)
    }

    const [file, setFile] = useState<File>()

    const [progress, setProgress] = useState(0)

    const clickHandler = async () => {
        // const {result} = await ajax({
        //     url: 'https://gateway.queeny.cn/oss',
        //     method: 'POST',
        //     params: {
        //         method: 'presignedPutObject',
        //         oid: '6ffb8efe-268a-4d18-94cf-06a22961c21a'
        //     },
        //     headers: {
        //         'x-access-token': testToken
        //     },
        //     data: {
        //         bucketName: 'test-bucket',
        //         objectName: 'solution.pptx',
        //         randomFileName: true
        //     }
        // }) as any
        // console.log(49, result.payload.data.data.url)
        const url = 'https://oss.queeny.cn/test-bucket/27d84c93-3524-48f6-8d62-d15ea541f0e8.pptx?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ypejadz7g1ms0KBKl1zo%2F20231212%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20231212T053019Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host&X-Amz-Signature=bc7037763731876618ac97e51f0db28d1e8ddeaf76720ba01c0059a36fc87950'
        const res = await ajax({
            url,
            method: 'POST',
            // data: await file?.arrayBuffer()
            data: file,
            onUploadProgress({loaded, total}) {
                console.log(59, loaded, total)
                setProgress(loaded / total!)
            }
        })
        console.log(60, res)
    }

    return (
        <>
            <h1>This is A test for {name}</h1>
            <button onClick={login}>login</button>
            <button onClick={clickHandler}>test upload file</button>
            <input type="file" onChange={e => {
                setFile(e.target.files?.[0])
            }} />
            <progress value={progress}/>
        </>
    )
}

createRoot(document.getElementById('app')!).render(<App />)