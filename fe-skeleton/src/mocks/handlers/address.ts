import { http, HttpResponse, delay } from 'msw'
import { createAddressSchema } from '../../schemas/address'
import addressesData from '../data/addresses.json'

let addresses = [...addressesData.addresses]
let nextId = Math.max(...addresses.map(a => a.member_address_id)) + 1

export const addressHandlers = [
  // GET /api/addresses - 주소 목록 조회
  http.get('/api/addresses', async () => {
    await delay(300)
    return HttpResponse.json(addresses.filter(a => a.member_address_status === 'active'))
  }),

  // POST /api/addresses - 주소 추가
  http.post('/api/addresses', async ({ request }) => {
    const body = await request.json()

    try {
      const validated = createAddressSchema.parse(body)
      await delay(500)

      // 기본 주소 설정 시 기존 기본 주소 해제
      if (validated.member_address_is_default) {
        addresses = addresses.map(addr => ({
          ...addr,
          member_address_is_default: false
        }))
      }

      const newAddress = {
        member_address_id: nextId++,
        member_id: 1,
        ...validated,
        member_address_last_used_at: null,
        member_address_status: 'active' as const,
        member_address_created_at: new Date().toISOString(),
        member_address_updated_at: new Date().toISOString()
      }

      addresses.push(newAddress)
      return HttpResponse.json(newAddress, { status: 201 })
    } catch (error) {
      return HttpResponse.json(
        { error: '유효하지 않은 데이터입니다', details: error },
        { status: 400 }
      )
    }
  }),

  // PUT /api/addresses/:id - 주소 수정
  http.put('/api/addresses/:id', async ({ params, request }) => {
    const id = Number(params.id)
    const body = await request.json()

    try {
      const validated = createAddressSchema.parse(body)
      await delay(500)

      const index = addresses.findIndex(a => a.member_address_id === id)
      if (index === -1) {
        return HttpResponse.json({ error: '주소를 찾을 수 없습니다' }, { status: 404 })
      }

      // 기본 주소 설정 시 기존 기본 주소 해제
      if (validated.member_address_is_default) {
        addresses = addresses.map(addr => ({
          ...addr,
          member_address_is_default: addr.member_address_id === id
        }))
      }

      addresses[index] = {
        ...addresses[index],
        ...validated,
        member_address_updated_at: new Date().toISOString()
      }

      return HttpResponse.json(addresses[index])
    } catch (error) {
      return HttpResponse.json(
        { error: '유효하지 않은 데이터입니다', details: error },
        { status: 400 }
      )
    }
  }),

  // DELETE /api/addresses/:id - 주소 삭제
  http.delete('/api/addresses/:id', async ({ params }) => {
    const id = Number(params.id)
    await delay(300)

    const index = addresses.findIndex(a => a.member_address_id === id)
    if (index === -1) {
      return HttpResponse.json({ error: '주소를 찾을 수 없습니다' }, { status: 404 })
    }

    // Soft delete
    addresses[index] = {
      ...addresses[index],
      member_address_status: 'inactive' as const,
      member_address_updated_at: new Date().toISOString()
    }

    return HttpResponse.json({ success: true }, { status: 204 })
  }),

  // PATCH /api/addresses/:id/default - 기본 주소 설정
  http.patch('/api/addresses/:id/default', async ({ params }) => {
    const id = Number(params.id)
    await delay(300)

    const index = addresses.findIndex(a => a.member_address_id === id)
    if (index === -1) {
      return HttpResponse.json({ error: '주소를 찾을 수 없습니다' }, { status: 404 })
    }

    // 모든 주소의 기본 설정 해제 후 선택한 주소만 기본으로 설정
    addresses = addresses.map((addr, idx) => ({
      ...addr,
      member_address_is_default: idx === index,
      member_address_updated_at: new Date().toISOString()
    }))

    return HttpResponse.json(addresses[index])
  })
]
