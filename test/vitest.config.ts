import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['test/suites/**/*.spec.ts'],
        setupFiles: [path.join(__dirname, 'setup.ts')],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            reportsDirectory: path.join(__dirname, 'coverage'),
            reporter: ['text', 'json-summary', 'html'],
            reportOnFailure: true,
            thresholds: {
                statements: 100,
                branches: 99,
                functions: 100,
                lines: 100
            }
        }
    },
})
