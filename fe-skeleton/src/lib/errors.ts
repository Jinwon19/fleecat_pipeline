/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: unknown
  ) {
    super(message)
    this.name = 'ApiError'

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError)
    }
  }

  /**
   * Check if error is a specific HTTP status
   */
  isStatus(status: number): boolean {
    return this.status === status
  }

  /**
   * Check if error is client error (4xx)
   */
  isClientError(): boolean {
    return this.status >= 400 && this.status < 500
  }

  /**
   * Check if error is server error (5xx)
   */
  isServerError(): boolean {
    return this.status >= 500 && this.status < 600
  }
}

/**
 * Network error (connection issues)
 */
export class NetworkError extends Error {
  constructor(message = 'Network connection failed') {
    super(message)
    this.name = 'NetworkError'
  }
}

/**
 * Validation error (data validation failed)
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Type guard to check if error is ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/**
 * Type guard to check if error is NetworkError
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError
}

/**
 * Type guard to check if error is ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message
  }

  if (isNetworkError(error)) {
    return 'Network connection failed. Please check your internet connection.'
  }

  if (isValidationError(error)) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred'
}
