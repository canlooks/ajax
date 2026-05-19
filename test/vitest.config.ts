import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['**/*.spec.ts'],
        setupFiles: [path.join(__dirname, 'setup.ts')],
        // Use the test tsconfig which extends root tsconfig
        // and has experimentalDecorators enabled
    },
    resolve: {
        alias: {
            // Source files import from '..' and '../index' — these resolve to
            // the project root's index.d.ts during compilation. For vitest,
            // we must ensure the same resolution.
        }
    }
})
