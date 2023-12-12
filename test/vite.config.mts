import {defineConfig} from 'vite'
import path from 'path'

export default defineConfig(() => ({
    root: path.join(process.cwd(), 'test')
}))