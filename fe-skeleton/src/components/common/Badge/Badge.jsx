import './Badge.css';

export default function Badge({
  children,
  variant = 'default',
  size = 'medium',
  className = '',
  ...props
}) {
  const classNames = [
    'badge',
    `badge--${variant}`,
    `badge--${size}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={classNames} {...props}>
      {children}
    </span>
  );
}
