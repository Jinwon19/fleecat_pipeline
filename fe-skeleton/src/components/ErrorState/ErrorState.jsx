import { AlertCircle, WifiOff, ServerCrash, FileQuestion } from 'lucide-react'
import './ErrorState.css'

const iconMap = {
  network: WifiOff,
  server: ServerCrash,
  notfound: FileQuestion,
  generic: AlertCircle
}

/**
 * ErrorState Component
 *
 * Displays error messages with appropriate icons and retry functionality
 *
 * @param {Object} props
 * @param {string} props.title - Error title
 * @param {string} props.message - Error message
 * @param {Error|ApiError} props.error - Error object
 * @param {Function} props.onRetry - Retry callback
 * @param {'network'|'server'|'notfound'|'generic'} props.variant - Error type variant
 */
export default function ErrorState({
  title = '문제가 발생했습니다',
  message,
  error,
  onRetry,
  variant = 'generic'
}) {
  const Icon = iconMap[variant] || AlertCircle
  const errorMessage = message || error?.message || '알 수 없는 오류가 발생했습니다.'

  return (
    <div className="error-state" role="alert" aria-live="assertive">
      <div className="error-state__icon" aria-hidden="true">
        <Icon size={48} strokeWidth={1.5} />
      </div>
      <h3 className="error-state__title">{title}</h3>
      <p className="error-state__message">{errorMessage}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="error-state__retry-btn"
          type="button"
        >
          다시 시도
        </button>
      )}
    </div>
  )
}
