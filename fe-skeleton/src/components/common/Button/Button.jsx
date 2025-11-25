import './Button.css'

export default function Button({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  type = 'button',
  onClick,
  icon,
  fullWidth = false,
  className = '',
  ariaLabel,
  ...props
}) {
  const classNames = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth && 'btn--full-width',
    loading && 'btn--loading',
    className
  ].filter(Boolean).join(' ')

  const handleClick = (e) => {
    if (disabled || loading) return
    onClick?.(e)
  }

  // 아이콘만 있고 텍스트가 없으면 aria-label 필수
  const needsAriaLabel = icon && !children

  return (
    <button
      type={type}
      className={classNames}
      onClick={handleClick}
      disabled={disabled || loading}
      aria-label={ariaLabel || (needsAriaLabel ? '버튼' : undefined)}
      aria-busy={loading}
      {...props}
    >
      {loading && <span className="btn-spinner" aria-hidden="true"></span>}
      {icon && <span className="btn-icon" aria-hidden="true">{icon}</span>}
      {children && <span className="btn-text">{children}</span>}
    </button>
  )
}
