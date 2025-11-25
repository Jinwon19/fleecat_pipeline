import { Inbox } from 'lucide-react'
import './EmptyState.css'

/**
 * EmptyState Component
 *
 * Displays empty state with optional icon and action button
 *
 * @param {Object} props
 * @param {string} props.title - Empty state title
 * @param {string} props.message - Empty state message
 * @param {React.ReactNode} props.icon - Custom icon (defaults to Inbox)
 * @param {Object} props.action - Action button config
 * @param {string} props.action.label - Button label
 * @param {Function} props.action.onClick - Button click handler
 */
export default function EmptyState({
  title = '데이터가 없습니다',
  message = '아직 표시할 내용이 없습니다.',
  icon,
  action
}) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">
        {icon || <Inbox size={48} strokeWidth={1.5} />}
      </div>
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__message">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="empty-state__action-btn"
          type="button"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
