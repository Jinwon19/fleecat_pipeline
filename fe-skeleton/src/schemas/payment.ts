import { z } from 'zod'

// Enum types
export const PaymentMethodSchema = z.enum([
  'credit_card',
  'debit_card',
  'bank_transfer',
  'virtual_account',
  'mobile_payment',
  'paypal'
])

export const PaymentStatusSchema = z.enum([
  'pending',
  'completed',
  'failed',
  'cancelled',
  'refunded'
])

// Payment schema
export const PaymentSchema = z.object({
  payment_id: z.number().int().positive(),
  order_id: z.number().int().positive(),
  payment_method: PaymentMethodSchema,
  payment_amount: z.number().positive(),
  payment_status: PaymentStatusSchema,
  payment_transaction_id: z.string().nullable(),
  payment_gateway: z.string().nullable(),
  payment_completed_at: z.string().datetime().nullable(),
  payment_created_at: z.string().datetime(),
  payment_updated_at: z.string().datetime()
})

// Payment create schema
export const PaymentCreateSchema = PaymentSchema.omit({
  payment_id: true,
  payment_transaction_id: true,
  payment_completed_at: true,
  payment_created_at: true,
  payment_updated_at: true
})

// Type exports
export type Payment = z.infer<typeof PaymentSchema>
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>
export type PaymentCreate = z.infer<typeof PaymentCreateSchema>
