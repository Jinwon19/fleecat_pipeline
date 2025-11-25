import { z } from 'zod'

// Enum types
export const OrderStatusSchema = z.enum([
  'pending_payment',
  'payment_completed',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
  'exchange_requested',
  'return_requested'
])

export const ShippingStatusSchema = z.enum([
  'pending',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'failed',
  'returned'
])

// Order Item schema
export const OrderItemSchema = z.object({
  order_item_id: z.number().int().positive(),
  order_id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  order_item_quantity: z.number().int().positive(),
  order_item_price: z.number().positive(),
  order_item_discount: z.number().min(0).default(0),
  order_item_final_price: z.number().positive(),
  order_item_created_at: z.string().datetime(),
  order_item_updated_at: z.string().datetime()
})

// Order schema
export const OrderSchema = z.object({
  order_id: z.number().int().positive(),
  member_id: z.number().int().positive(),
  order_number: z.string().min(10).max(50),
  order_status: OrderStatusSchema,
  shipping_address_id: z.number().int().positive(),
  shipping_status: ShippingStatusSchema,
  shipping_tracking_number: z.string().nullable(),
  shipping_company: z.string().nullable(),
  order_total_amount: z.number().positive(),
  order_discount_amount: z.number().min(0).default(0),
  order_final_amount: z.number().positive(),
  order_note: z.string().max(500).nullable(),
  order_created_at: z.string().datetime(),
  order_updated_at: z.string().datetime()
})

// Order with items
export const OrderWithItemsSchema = OrderSchema.extend({
  items: z.array(OrderItemSchema)
})

// Order filter params
export const OrderFilterSchema = z.object({
  status: OrderStatusSchema.optional(),
  shipping_status: ShippingStatusSchema.optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20)
})

// Type exports
export type Order = z.infer<typeof OrderSchema>
export type OrderItem = z.infer<typeof OrderItemSchema>
export type OrderWithItems = z.infer<typeof OrderWithItemsSchema>
export type OrderStatus = z.infer<typeof OrderStatusSchema>
export type ShippingStatus = z.infer<typeof ShippingStatusSchema>
export type OrderFilter = z.infer<typeof OrderFilterSchema>
