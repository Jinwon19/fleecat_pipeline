import { http, HttpResponse, delay } from 'msw'
import membersData from '../data/members.json'
import { MemberSchema, ProfileUpdateSchema } from '../../schemas/member'

// Simulate network delay
const networkDelay = () => delay(Math.random() * 900 + 300) // 300-1200ms

// Random error simulation (10% chance)
const shouldFail = () => Math.random() < 0.1

export const memberHandlers = [
  // GET /api/member/profile
  http.get('/api/member/profile', async () => {
    await networkDelay()

    if (shouldFail()) {
      return HttpResponse.json(
        { message: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    // Return first member as current user
    const member = membersData.members[0]
    const validated = MemberSchema.parse(member)

    return HttpResponse.json(validated)
  }),

  // PUT /api/member/profile
  http.put('/api/member/profile', async ({ request }) => {
    await networkDelay()

    if (shouldFail()) {
      return HttpResponse.json(
        { message: 'Failed to update profile' },
        { status: 500 }
      )
    }

    const body = await request.json()

    try {
      // Validate request body
      const validated = ProfileUpdateSchema.parse(body)

      // Simulate update
      const member = membersData.members[0]
      const updated = {
        ...member,
        ...validated,
        member_updated_at: new Date().toISOString()
      }

      return HttpResponse.json(updated)
    } catch (error) {
      return HttpResponse.json(
        { message: 'Validation failed', errors: error },
        { status: 400 }
      )
    }
  }),

  // DELETE /api/member/account
  http.delete('/api/member/account', async () => {
    await networkDelay()

    if (shouldFail()) {
      return HttpResponse.json(
        { message: 'Failed to delete account' },
        { status: 500 }
      )
    }

    return HttpResponse.json({ message: 'Account deleted successfully' })
  })
]
