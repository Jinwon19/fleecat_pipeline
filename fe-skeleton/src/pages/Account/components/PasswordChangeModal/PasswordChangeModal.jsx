import { useState } from 'react'
import { z } from 'zod'
import { toastErr } from '../../../../lib/toast'
import Button from '../../../../components/common/Button'
import Input from '../../../../components/common/Input'
import './PasswordChangeModal.css'

// Zod 스키마 정의: 8자 이상, 영문+숫자+특수문자
const passwordSchema = z
  .string()
  .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
  .regex(/[a-zA-Z]/, '비밀번호에 영문자가 포함되어야 합니다')
  .regex(/[0-9]/, '비밀번호에 숫자가 포함되어야 합니다')
  .regex(/[^a-zA-Z0-9]/, '비밀번호에 특수문자가 포함되어야 합니다')

export default function PasswordChangeModal({ onClose, onSubmit }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()

    // 새 비밀번호 일치 확인
    if (newPassword !== confirmPassword) {
      toastErr('새 비밀번호가 일치하지 않습니다')
      return
    }

    // Zod 스키마 검증
    try {
      passwordSchema.parse(newPassword)
    } catch (error) {
      if (error instanceof z.ZodError) {
        toastErr(error.errors[0].message)
        return
      }
    }

    onSubmit(currentPassword, newPassword)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--wide" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">비밀번호 변경</h3>
        <form onSubmit={handleSubmit} className="password-form">
          <div className="form-group">
            <label className="form-label">현재 비밀번호</label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <div className="form-group">
            <label className="form-label">새 비밀번호</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength="6"
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label className="form-label">새 비밀번호 확인</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength="6"
              autoComplete="new-password"
            />
          </div>

          <div className="modal-buttons">
            <Button type="button" variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" variant="primary">
              변경하기
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
