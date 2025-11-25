import './SkeletonList.css'

/**
 * SkeletonList Component
 *
 * Displays skeleton loading placeholders
 *
 * @param {Object} props
 * @param {number} props.count - Number of skeleton items
 * @param {'card'|'list'|'table'} props.variant - Skeleton variant
 * @param {string|number} props.height - Height of each skeleton item
 */
export default function SkeletonList({
  count = 3,
  variant = 'card',
  height = '120px'
}) {
  return (
    <div className={`skeleton-list skeleton-list--${variant}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="skeleton-item"
          style={{ height }}
          aria-busy="true"
          aria-label="로딩 중"
        >
          <div className="skeleton-shimmer" />
        </div>
      ))}
    </div>
  )
}
