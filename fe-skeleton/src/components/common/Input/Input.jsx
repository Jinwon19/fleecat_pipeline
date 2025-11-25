import { useState } from 'react'
import './Input.css'

let inputIdCounter = 0

export default function Input({
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  readOnly = false,
  id,
  className = '',
  ...props
}) {
  const [inputId] = useState(() => id || `input-${++inputIdCounter}`)
  const errorId = `${inputId}-error`

  const classNames = [
    'input-wrapper',
    error && 'input-wrapper--error',
    disabled && 'input-wrapper--disabled',
    className
  ].filter(Boolean).join(' ')

  const inputClassNames = [
    'input-field',
    error && 'input-field--error',
    readOnly && 'input-field--readonly'
  ].filter(Boolean).join(' ')

  return (
    <div className={classNames}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
          {required && <span className="input-required" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={inputClassNames}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error && (
        <span id={errorId} className="input-error-message" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
