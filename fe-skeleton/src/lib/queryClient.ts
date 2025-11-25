import { QueryClient } from '@tanstack/react-query'

/**
 * Create and configure Query Client
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Queries will be considered stale after 5 minutes
      staleTime: 5 * 60 * 1000,
      // Cached data will be garbage collected after 30 minutes
      gcTime: 30 * 60 * 1000,
      // Retry failed requests once
      retry: 1,
      // Don't refetch on window focus
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect
      refetchOnReconnect: false,
      // Don't refetch on mount if data is fresh
      refetchOnMount: false
    },
    mutations: {
      // Retry failed mutations once
      retry: 1
    }
  }
})
