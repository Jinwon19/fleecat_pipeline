import { z } from 'zod'

export const addressSchema = z.object({
  member_address_id: z.number().int().positive(),
  member_id: z.number().int().positive(),
  member_address_alias: z.string()
    .min(1, '배송지 이름을 입력하세요')
    .max(20, '배송지 이름은 최대 20자까지 가능합니다'),
  member_address_is_default: z.boolean(),
  member_address_recipient: z.string()
    .min(2, '받는 분 이름은 최소 2자 이상이어야 합니다')
    .max(20, '받는 분 이름은 최대 20자까지 가능합니다'),
  member_address_phone: z.string()
    .regex(/^010-\d{4}-\d{4}$/, '010-0000-0000 형식으로 입력하세요'),
  member_address_zipcode: z.string()
    .length(5, '우편번호 5자리를 입력하세요'),
  member_address_address1: z.string()
    .min(1, '기본 주소를 입력하세요'),
  member_address_address2: z.string().nullable(),
  member_address_last_used_at: z.string().datetime().nullable(),
  member_address_status: z.enum(['active', 'inactive']),
  member_address_created_at: z.string().datetime(),
  member_address_updated_at: z.string().datetime()
})

export type Address = z.infer<typeof addressSchema>

// 주소 생성/수정용 스키마
export const createAddressSchema = addressSchema.omit({
  member_address_id: true,
  member_id: true,
  member_address_last_used_at: true,
  member_address_status: true,
  member_address_created_at: true,
  member_address_updated_at: true
})

export type CreateAddress = z.infer<typeof createAddressSchema>
