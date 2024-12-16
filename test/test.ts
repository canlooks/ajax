import {ajax} from '../src'
import fs from 'fs'
import path from 'path'

const image = fs.readFileSync(path.resolve('test/image.png'))

ajax({
    method: 'POST',
    url: 'http://localhost:3000/upload',
    body: new Blob([image]),
    onUploadProgress(e) {
        console.log(10, e)
    }
}).then(res => {
    console.log('success', res.result)
}).catch(err => {
    console.log('error', err)
})