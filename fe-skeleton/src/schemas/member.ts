import { z } from 'zod'

// Enum types
export const MemberAccountTypeSchema = z.enum(['individual', 'business'])
export const MemberAccountRoleSchema = z.enum(['buyer', 'seller'])
export const MemberStatusSchema = z.enum(['active', 'inactive', 'suspended', 'deleted'])

// Member schema (matches Prisma schema)
export const MemberSchema = z.object({
  member_id: z.number().int().positive(),
  company_id: z.number().int().positive().nullable(),
  member_email: z.string().email(),
  member_password: z.string().nullable(), // Excluded in responses
  member_name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다').max(50, '이름은 최대 50자까지 가능합니다'),
  member_nickname: z.string().min(2, '닉네임은 최소 2자 이상이어야 합니다').max(30, '닉네임은 최대 30자까지 가능합니다'),
  member_phone: z.string().regex(/^010-\d{4}-\d{4}$/, '010-0000-0000 형식으로 입력하세요').nullable(),
  member_account_type: MemberAccountTypeSchema,
  member_account_role: MemberAccountRoleSchema,
  member_status: MemberStatusSchema,
  member_marketing_email: z.boolean().default(false),
  member_marketing_sms: z.boolean().default(false),
  member_last_login_at: z.string().datetime().nullable(),
  member_created_at: z.string().datetime(),
  member_updated_at: z.string().datetime()
})

// Profile update schema (required fields: name, nickname)
export const ProfileUpdateSchema = MemberSchema.pick({
  member_name: true,
  member_nickname: true,
  member_phone: true,
  member_marketing_email: true,
  member_marketing_sms: true
}).required({
  member_name: true,
  member_nickname: true
}).partial({
  member_phone: true,
  member_marketing_email: true,
  member_marketing_sms: true
})

// Password change schema
export const PasswordChangeSchema = z.object({
  current_password: z.string().min(8),
  new_password: z.string().min(8).max(100)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number, and special character'),
  confirm_password: z.string()
}).refine(data => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password']
})

// Public member schema (no sensitive data)
export const PublicMemberSchema = MemberSchema.omit({
  member_password: true,
  member_email: true,
  member_phone: true
})

// Type exports
export type Member = z.infer<typeof MemberSchema>
export type MemberAccountType = z.infer<typeof MemberAccountTypeSchema>
export type MemberAccountRole = z.infer<typeof MemberAccountRoleSchema>
export type MemberStatus = z.infer<typeof MemberStatusSchema>
export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>
export type PasswordChange = z.infer<typeof PasswordChangeSchema>
export type PublicMember = z.infer<typeof PublicMemberSchema>
