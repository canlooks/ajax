import {mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {tmpdir} from 'node:os'
import {fileURLToPath} from 'node:url'
import path from 'node:path'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const npmCli = process.env.npm_execpath
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'canlooks-ajax-consumers-'))

function run(command, args, cwd) {
    const result = spawnSync(command, args, {
        cwd,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024
    })
    if (result.error || result.status !== 0) {
        throw new Error([
            `Command failed: ${command} ${args.join(' ')}`,
            result.stdout,
            result.stderr,
            result.error?.stack
        ].filter(Boolean).join('\n'))
    }
    return result.stdout
}

function runNpm(args, cwd) {
    return npmCli
        ? run(process.execPath, [npmCli, ...args], cwd)
        : run(npmCommand, args, cwd)
}

function parsePackMetadata(output) {
    const normalized = output.trim()
    const jsonStart = normalized.startsWith('[')
        ? 0
        : normalized.lastIndexOf('\n[') + 1
    if (jsonStart < 0 || normalized[jsonStart] !== '[') {
        throw new Error(`Unable to locate npm pack JSON output:\n${output}`)
    }
    return JSON.parse(normalized.slice(jsonStart))
}

async function writeJson(file, value) {
    await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

try {
    const packOutput = runNpm(
        ['pack', '--json', '--pack-destination', temporaryRoot],
        repositoryRoot
    )
    const [metadata] = parsePackMetadata(packOutput)
    const tarball = path.join(temporaryRoot, metadata.filename)
    const consumerRoot = path.join(temporaryRoot, 'consumer')
    await mkdir(consumerRoot)
    await writeJson(path.join(consumerRoot, 'package.json'), {
        private: true,
        type: 'module'
    })

    runNpm(
        ['install', tarball, '--no-audit', '--no-fund', '--ignore-scripts', '--package-lock=false'],
        consumerRoot
    )

    await writeFile(path.join(consumerRoot, 'esm.mjs'), `
import * as pkg from '@canlooks/ajax'

for (const name of ['ajax', 'Service', 'Config', 'AjaxError', 'mergeAbortSignalScope', 'mergeConfigScope']) {
  if (!(name in pkg)) throw new Error(\`Missing ESM named export: \${name}\`)
}
if ('default' in pkg) throw new Error('Unexpected ESM default export')
`, 'utf8')

    await writeFile(path.join(consumerRoot, 'commonjs.cjs'), `
const pkg = require('@canlooks/ajax')

for (const name of ['ajax', 'Service', 'Config', 'AjaxError', 'mergeAbortSignalScope', 'mergeConfigScope']) {
  if (!(name in pkg)) throw new Error(\`Missing CommonJS named export: \${name}\`)
}
if ('default' in pkg) throw new Error('Unexpected CommonJS default export')
`, 'utf8')

    run(process.execPath, ['esm.mjs'], consumerRoot)
    run(process.execPath, ['commonjs.cjs'], consumerRoot)

    await writeFile(path.join(consumerRoot, 'consumer.ts'), `
import {ajax, Service, mergeAbortSignalScope} from '@canlooks/ajax'
import type {AbortSignalScope, AjaxResponse, AjaxReturn} from '@canlooks/ajax'

type User = {id: number}

const ajaxRequest: AjaxReturn<User> = ajax.get<User>('/users/1')
const serviceRequest: Promise<AjaxResponse<User>> = Service.get<User>('/users/1')
const firstController = new AbortController()
const secondController = new AbortController()
const signalScope: AbortSignalScope = mergeAbortSignalScope(
  firstController.signal,
  secondController.signal
)

// @ts-expect-error @canlooks/ajax intentionally exposes named exports only
import defaultAjax from '@canlooks/ajax'

void ajaxRequest
void serviceRequest
void signalScope.signal
void signalScope.cleanup
void defaultAjax
`, 'utf8')
    await writeJson(path.join(consumerRoot, 'tsconfig.json'), {
        compilerOptions: {
            target: 'ES2022',
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            strict: true,
            noEmit: true,
            skipLibCheck: false
        },
        include: ['consumer.ts']
    })

    const typescript = path.join(repositoryRoot, 'node_modules', 'typescript', 'bin', 'tsc')
    run(process.execPath, [typescript, '-p', 'tsconfig.json'], consumerRoot)

    process.stdout.write('ESM, CommonJS and TypeScript tarball consumers passed.\n')
} finally {
    await rm(temporaryRoot, {recursive: true, force: true})
}
