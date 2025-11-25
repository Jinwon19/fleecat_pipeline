import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

/**
 * Setup MSW browser worker
 */
export const worker = setupWorker(...handlers)
