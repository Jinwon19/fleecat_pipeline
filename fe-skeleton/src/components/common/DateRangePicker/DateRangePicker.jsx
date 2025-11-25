import { useState, useRef, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import './DateRangePicker.css'

const DEFAULT_PRESETS = [
  { label: '오늘', days: 0 },
  { label: '최근 7일', days: 7 },
  { label: '최근 30일', days: 30 },
  { label: '최근 90일', days: 90 }
]

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  maxDate = new Date(),
  minDate,
  presets = DEFAULT_PRESETS
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempStartDate, setTempStartDate] = useState(null)
  const [tempEndDate, setTempEndDate] = useState(null)
  const dropdownRef = useRef(null)

  // Initialize temp dates when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTempStartDate(startDate)
      setTempEndDate(endDate)
    }
  }, [isOpen, startDate, endDate])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // ESC 키로 드롭다운 닫기
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handlePresetClick = (days) => {
    const end = new Date()
    const start = new Date()
    if (days > 0) {
      start.setDate(start.getDate() - days)
    }

    onChange({ startDate: start, endDate: end })
    setIsOpen(false)
  }

  const formatDate = (date) => {
    if (!date) return ''
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const formatDateInput = (date) => {
    if (!date) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const parseInputDate = (value) => {
    if (!value) return null
    const date = new Date(value)
    // Set to start of day in local timezone
    date.setHours(0, 0, 0, 0)
    return date
  }

  return (
    <div className="date-range-picker" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="date-range-picker__trigger"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="날짜 범위 선택"
      >
        <Calendar size={16} aria-hidden="true" />
        <span aria-live="polite">
          {startDate && endDate
            ? `${formatDate(startDate)} - ${formatDate(endDate)}`
            : '기간 선택'}
        </span>
      </button>

      {isOpen && (
        <div className="date-range-picker__dropdown" role="dialog" aria-label="날짜 범위 선택 대화상자">
          <div className="date-range-picker__presets">
            {presets.map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePresetClick(preset.days)}
                className="preset-btn"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="date-range-picker__divider" />

          <div className="date-range-picker__custom">
            <div className="date-input-group">
              <label htmlFor="start-date" className="date-label">
                시작일
              </label>
              <input
                id="start-date"
                type="date"
                value={formatDateInput(tempStartDate)}
                onChange={(e) => {
                  const newStartDate = parseInputDate(e.target.value)
                  setTempStartDate(newStartDate)

                  // Only apply if both dates are selected
                  if (newStartDate && tempEndDate) {
                    onChange({ startDate: newStartDate, endDate: tempEndDate })
                    setIsOpen(false)
                  }
                }}
                max={tempEndDate ? formatDateInput(tempEndDate) : formatDateInput(maxDate)}
                min={minDate ? formatDateInput(minDate) : undefined}
                className="date-input"
              />
            </div>

            <div className="date-input-group">
              <label htmlFor="end-date" className="date-label">
                종료일
              </label>
              <input
                id="end-date"
                type="date"
                value={formatDateInput(tempEndDate)}
                onChange={(e) => {
                  const newEndDate = parseInputDate(e.target.value)
                  setTempEndDate(newEndDate)

                  // Only apply if both dates are selected
                  if (tempStartDate && newEndDate) {
                    onChange({ startDate: tempStartDate, endDate: newEndDate })
                    setIsOpen(false)
                  }
                }}
                max={formatDateInput(maxDate)}
                min={tempStartDate ? formatDateInput(tempStartDate) : minDate ? formatDateInput(minDate) : undefined}
                className="date-input"
              />
            </div>
          </div>

          <div className="date-range-picker__actions">
            <button
              type="button"
              onClick={() => {
                setTempStartDate(null)
                setTempEndDate(null)
                onChange({ startDate: null, endDate: null })
                setIsOpen(false)
              }}
              className="date-range-picker__clear"
            >
              초기화
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
