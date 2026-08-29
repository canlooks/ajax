import createFetchMock from 'vitest-fetch-mock'
import { vi, afterEach } from 'vitest'

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

afterEach(() => {
    fetchMock.resetMocks()
    vi.useRealTimers()
    vi.unstubAllEnvs()
})
