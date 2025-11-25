import './Spinner.css'

export default function Spinner({
  size = 'medium',
  message,
  fullPage = false
}) {
  const spinnerClassNames = [
    'spinner',
    `spinner--${size}`
  ].filter(Boolean).join(' ')

  const spinner = (
    <div className={spinnerClassNames}>
      <div className="spinner-circle"></div>
      {message && <p className="spinner-message">{message}</p>}
    </div>
  )

  if (fullPage) {
    return (
      <div className="spinner-overlay">
        {spinner}
      </div>
    )
  }

  return spinner
}
