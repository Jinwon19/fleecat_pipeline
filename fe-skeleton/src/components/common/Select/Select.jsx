import { useState } from 'react';
import './Select.css';

let selectIdCounter = 0;

export default function Select({
  label,
  options = [],
  value,
  onChange,
  placeholder = '선택하세요',
  error,
  disabled = false,
  required = false,
  id,
  className = '',
  ...props
}) {
  const [selectId] = useState(() => id || `select-${++selectIdCounter}`);
  const errorId = `${selectId}-error`;

  const handleChange = (e) => {
    onChange?.(e.target.value);
  };

  return (
    <div className={`select-wrapper ${className}`}>
      {label && (
        <label htmlFor={selectId} className="select-label">
          {label}
          {required && <span className="select-required" aria-hidden="true">*</span>}
        </label>
      )}

      <select
        id={selectId}
        className={`select ${error ? 'select--error' : ''}`}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <span id={errorId} className="select-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
