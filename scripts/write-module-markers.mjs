import {mkdir, writeFile} from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const markers = [
    ['esm', 'module'],
    ['cjs', 'commonjs'],
    ['types', 'module']
]

await Promise.all(markers.map(async ([directory, type]) => {
    const outputDirectory = path.join(root, 'dist', directory)
    await mkdir(outputDirectory, {recursive: true})
    await writeFile(
        path.join(outputDirectory, 'package.json'),
        `${JSON.stringify({type}, null, 2)}\n`,
        'utf8'
    )
}))
