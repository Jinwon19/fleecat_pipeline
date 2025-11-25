import { useQuery } from '@tanstack/react-query'
import { fetcher } from '../lib/http'
import { OrderWithItemsSchema, OrderFilter } from '../schemas/order'

interface OrdersResponse {
  success: boolean
  data: any[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Fetch orders with filtering and pagination
 */
export function useOrders(filters?: Partial<OrderFilter>) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: async () => {
      // Build query parameters
      const params: Record<string, string> = {}

      if (filters?.status) params.status = filters.status
      if (filters?.shipping_status) params.shipping_status = filters.shipping_status
      if (filters?.date_from) params.date_from = filters.date_from
      if (filters?.date_to) params.date_to = filters.date_to
      if (filters?.search) params.search = filters.search
      if (filters?.page) params.page = String(filters.page)
      if (filters?.limit) params.limit = String(filters.limit)

      const response = await fetcher<OrdersResponse>('/api/orders', { params })

      // Validate response data
      if (response.success && response.data) {
        const validated = response.data.map(order => OrderWithItemsSchema.parse(order))
        return {
          orders: validated,
          pagination: response.pagination
        }
      }

      throw new Error('Invalid response format')
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2
  })
}

/**
 * Fetch single order by ID
 */
export function useOrder(orderId: number | null) {
  return useQuery({
    queryKey: ['orders', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID is required')

      const response = await fetcher<{ success: boolean; data: any }>(
        `/api/orders/${orderId}`
      )

      if (response.success && response.data) {
        return OrderWithItemsSchema.parse(response.data)
      }

      throw new Error('Invalid response format')
    },
    enabled: !!orderId,
    staleTime: 1000 * 60 * 5
  })
}
