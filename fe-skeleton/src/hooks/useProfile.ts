import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '../lib/http'
import { Member, ProfileUpdate, MemberSchema, ProfileUpdateSchema } from '../schemas/member'
import toast from 'react-hot-toast'

/**
 * Fetch profile data
 */
export function useProfile() {
  return useQuery({
    queryKey: ['member', 'profile'],
    queryFn: async () => {
      const data = await http.get<Member>('/api/member/profile')

      // Validate response data
      const validated = MemberSchema.parse(data)
      return validated
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  })
}

/**
 * Update profile with Optimistic UI
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ProfileUpdate) => {
      // Validate before sending
      const validated = ProfileUpdateSchema.parse(data)

      const response = await http.put<Member>('/api/member/profile', validated)
      return response
    },

    // Optimistic Update
    onMutate: async (newData: ProfileUpdate) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['member', 'profile'] })

      // Snapshot the previous value
      const previousProfile = queryClient.getQueryData<Member>(['member', 'profile'])

      // Optimistically update to the new value
      if (previousProfile) {
        queryClient.setQueryData<Member>(['member', 'profile'], {
          ...previousProfile,
          ...newData,
          member_updated_at: new Date().toISOString()
        })
      }

      // Return context with previous value
      return { previousProfile }
    },

    // On error, rollback to previous value
    onError: (error: Error, _variables, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(['member', 'profile'], context.previousProfile)
      }

      // Show error toast
      const errorMessage = error?.message || '프로필 수정에 실패했습니다'
      toast.error(errorMessage)
    },

    // On success, show success toast
    onSuccess: () => {
      toast.success('프로필이 성공적으로 수정되었습니다')
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['member', 'profile'] })
    }
  })
}
