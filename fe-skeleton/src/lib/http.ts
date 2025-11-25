import { ApiError, NetworkError } from './errors'

/**
 * Request configuration options
 */
type RequestConfig = RequestInit & {
  params?: Record<string, string | number | boolean>
  delay?: number // Development delay simulation
}

/**
 * Base fetch wrapper with error handling
 */
export async function fetcher<T>(
  url: string,
  config: RequestConfig = {}
): Promise<T> {
  const { params, delay: customDelay, ...init } = config

  // Build URL with query parameters
  const urlWithParams = params
    ? `${url}?${new URLSearchParams(
        Object.entries(params).reduce((acc, [key, value]) => {
          acc[key] = String(value)
          return acc
        }, {} as Record<string, string>)
      )}`
    : url

  // Development delay simulation
  if (customDelay && import.meta.env.DEV) {
    await new Promise(resolve => setTimeout(resolve, customDelay))
  }

  try {
    const response = await fetch(urlWithParams, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers
      }
    })

    // Handle non-OK responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        response.status,
        errorData.message || response.statusText,
        errorData
      )
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return {} as T
    }

    return response.json()
  } catch (error) {
    // Network errors
    if (error instanceof TypeError) {
      throw new NetworkError()
    }

    // Re-throw API errors
    throw error
  }
}

/**
 * HTTP GET request
 */
export function get<T>(url: string, config?: RequestConfig): Promise<T> {
  return fetcher<T>(url, {
    ...config,
    method: 'GET'
  })
}

/**
 * HTTP POST request
 */
export function post<T>(
  url: string,
  data?: unknown,
  config?: RequestConfig
): Promise<T> {
  return fetcher<T>(url, {
    ...config,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined
  })
}

/**
 * HTTP PUT request
 */
export function put<T>(
  url: string,
  data?: unknown,
  config?: RequestConfig
): Promise<T> {
  return fetcher<T>(url, {
    ...config,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined
  })
}

/**
 * HTTP PATCH request
 */
export function patch<T>(
  url: string,
  data?: unknown,
  config?: RequestConfig
): Promise<T> {
  return fetcher<T>(url, {
    ...config,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined
  })
}

/**
 * HTTP DELETE request
 */
export function del<T>(url: string, config?: RequestConfig): Promise<T> {
  return fetcher<T>(url, {
    ...config,
    method: 'DELETE'
  })
}

/**
 * Export all HTTP methods
 */
export const http = {
  get,
  post,
  put,
  patch,
  delete: del,
  fetcher
}
