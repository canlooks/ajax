import React from 'react'
import {createRoot} from 'react-dom/client'
import {ajax} from '../src'

function App() {
    return (
        <>
            <input type="file" onChange={async e => {
                const file = e.target.files?.[0]
                if (file) {
                    const res = await ajax({
                        method: 'post',
                        url: 'http://localhost:3000/upload',
                        body: file,
                        onUploadProgress(e) {
                            console.log(16, e)
                        }
                    })
                    console.log(19, res)
                }
            }}/>
        </>
    )
}

createRoot(document.getElementById('app')!).render(<App />)