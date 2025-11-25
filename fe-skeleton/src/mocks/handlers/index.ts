import { memberHandlers } from './member'
import { addressHandlers } from './address'
import { orderHandlers } from './order'

/**
 * Combine all MSW handlers
 */
export const handlers = [
  ...memberHandlers,
  ...addressHandlers,
  ...orderHandlers
]
