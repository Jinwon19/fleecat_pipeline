import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetcher } from '../lib/http'
import { Address, CreateAddress, addressSchema } from '../schemas/address'
import toast from 'react-hot-toast'

// 주소 목록 조회
export function useAddresses() {
  return useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const data = await fetcher<Address[]>('/api/addresses')
      return data.map(addr => addressSchema.parse(addr))
    }
  })
}

// 주소 추가
export function useCreateAddress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateAddress) => {
      return fetcher<Address>('/api/addresses', {
        method: 'POST',
        body: JSON.stringify(data)
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      toast.success('배송지가 추가되었습니다')
    },
    onError: () => {
      toast.error('배송지 추가에 실패했습니다')
    }
  })
}

// 주소 수정
export function useUpdateAddress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CreateAddress }) => {
      return fetcher<Address>(`/api/addresses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      toast.success('배송지가 수정되었습니다')
    },
    onError: () => {
      toast.error('배송지 수정에 실패했습니다')
    }
  })
}

// 주소 삭제
export function useDeleteAddress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      return fetcher(`/api/addresses/${id}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      toast.success('배송지가 삭제되었습니다')
    },
    onError: () => {
      toast.error('배송지 삭제에 실패했습니다')
    }
  })
}

// 기본 주소 설정
export function useSetDefaultAddress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      return fetcher<Address>(`/api/addresses/${id}/default`, {
        method: 'PATCH'
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      toast.success('기본 배송지로 설정되었습니다')
    },
    onError: () => {
      toast.error('기본 배송지 설정에 실패했습니다')
    }
  })
}
