import {rm} from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(process.cwd())
const outputDirectory = path.resolve(root, 'dist')

if (path.dirname(outputDirectory) !== root || path.basename(outputDirectory) !== 'dist') {
    throw new Error(`Refusing to clean unexpected output directory: ${outputDirectory}`)
}

await rm(outputDirectory, {recursive: true, force: true})
