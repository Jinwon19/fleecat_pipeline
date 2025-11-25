import { http, HttpResponse, delay } from 'msw'
import ordersData from '../data/orders.json'
import { OrderWithItemsSchema, OrderFilterSchema } from '../../schemas/order'

// Simulate network delay
const networkDelay = () => delay(Math.random() * 900 + 300) // 300-1200ms

// Random error simulation (disabled for development)
const shouldFail = () => false // Math.random() < 0.1

// In-memory store
let orders = [...ordersData.orders]

export const orderHandlers = [
  // GET /api/orders
  http.get('/api/orders', async ({ request }) => {
    await networkDelay()

    if (shouldFail()) {
      return HttpResponse.json(
        { message: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    const url = new URL(request.url)
    const params = Object.fromEntries(url.searchParams)

    try {
      // Validate query params
      const filters = OrderFilterSchema.parse({
        status: params.status || undefined,
        shipping_status: params.shipping_status || undefined,
        date_from: params.date_from || undefined,
        date_to: params.date_to || undefined,
        search: params.search || undefined,
        page: params.page ? parseInt(params.page) : 1,
        limit: params.limit ? parseInt(params.limit) : 20
      })

      // Filter orders
      let filtered = [...orders]

      // Filter by member_id (assuming current user is member_id: 1)
      const memberId = params.member_id ? parseInt(params.member_id) : 1
      filtered = filtered.filter(order => order.member_id === memberId)

      // Filter by status
      if (filters.status) {
        filtered = filtered.filter(order => order.order_status === filters.status)
      }

      // Filter by shipping status
      if (filters.shipping_status) {
        filtered = filtered.filter(order => order.shipping_status === filters.shipping_status)
      }

      // Filter by date range
      if (filters.date_from) {
        filtered = filtered.filter(order =>
          new Date(order.order_created_at) >= new Date(filters.date_from!)
        )
      }

      if (filters.date_to) {
        filtered = filtered.filter(order =>
          new Date(order.order_created_at) <= new Date(filters.date_to!)
        )
      }

      // Search by order number
      if (filters.search) {
        filtered = filtered.filter(order =>
          order.order_number.toLowerCase().includes(filters.search!.toLowerCase())
        )
      }

      // Sort by created date (newest first)
      filtered.sort((a, b) =>
        new Date(b.order_created_at).getTime() - new Date(a.order_created_at).getTime()
      )

      // Pagination
      const total = filtered.length
      const start = (filters.page - 1) * filters.limit
      const end = start + filters.limit
      const paginated = filtered.slice(start, end)

      // Validate and return
      const validated = paginated.map(order => OrderWithItemsSchema.parse(order))

      return HttpResponse.json({
        success: true,
        data: validated,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          totalPages: Math.ceil(total / filters.limit)
        }
      })
    } catch (error) {
      return HttpResponse.json(
        { message: 'Invalid query parameters', errors: error },
        { status: 400 }
      )
    }
  }),

  // GET /api/orders/:id
  http.get('/api/orders/:id', async ({ params }) => {
    await networkDelay()

    if (shouldFail()) {
      return HttpResponse.json(
        { message: 'Failed to fetch order' },
        { status: 500 }
      )
    }

    const id = parseInt(params.id as string)
    const order = orders.find(ord => ord.order_id === id)

    if (!order) {
      return HttpResponse.json(
        { message: 'Order not found' },
        { status: 404 }
      )
    }

    const validated = OrderWithItemsSchema.parse(order)

    return HttpResponse.json({
      success: true,
      data: validated
    })
  }),

  // POST /api/orders/:id/cancel
  http.post('/api/orders/:id/cancel', async ({ params }) => {
    await networkDelay()

    if (shouldFail()) {
      return HttpResponse.json(
        { message: 'Failed to cancel order' },
        { status: 500 }
      )
    }

    const id = parseInt(params.id as string)
    const orderIndex = orders.findIndex(ord => ord.order_id === id)

    if (orderIndex === -1) {
      return HttpResponse.json(
        { message: 'Order not found' },
        { status: 404 }
      )
    }

    const order = orders[orderIndex]

    // Check if order can be cancelled
    if (!['pending_payment', 'payment_completed', 'preparing'].includes(order.order_status)) {
      return HttpResponse.json(
        { message: 'Order cannot be cancelled at this stage' },
        { status: 400 }
      )
    }

    // Update order status
    orders[orderIndex] = {
      ...order,
      order_status: 'cancelled',
      order_updated_at: new Date().toISOString()
    }

    return HttpResponse.json({
      success: true,
      data: orders[orderIndex],
      message: 'Order cancelled successfully'
    })
  })
]
