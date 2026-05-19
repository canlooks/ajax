/**
 * Global test setup for vitest.
 * Uses vitest-fetch-mock to mock global fetch with request-queue semantics.
 */
import createFetchMock from 'vitest-fetch-mock'
import { vi, afterEach } from 'vitest'

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

// Reset mock state between tests
afterEach(() => {
    fetchMock.resetMocks()
})
