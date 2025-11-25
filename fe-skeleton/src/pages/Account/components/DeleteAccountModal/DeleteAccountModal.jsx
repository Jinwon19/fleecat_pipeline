import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import Button from '../../../../components/common/Button'
import './DeleteAccountModal.css'

export default function DeleteAccountModal({ onClose, onSubmit }) {
  const [selectedReason, setSelectedReason] = useState('')
  const [otherReasonDetail, setOtherReasonDetail] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const reasons = [
    '더 이상 사용하지 않음',
    '다른 서비스 이용',
    '개인정보 보호',
    '불만족',
    '기타'
  ]

  const handleSubmit = () => {
    if (!confirmed) return

    // "기타" 선택 시 직접 입력한 내용을 detail로 전달
    const detail = selectedReason === '기타' ? otherReasonDetail : null
    onSubmit(selectedReason, detail)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-content">
            <AlertTriangle size={24} className="warning-icon" />
            <h3 className="modal-title">회원 탈퇴</h3>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {/* Warning Section */}
          <div className="warning-section">
            <h4 className="warning-title">탈퇴 시 삭제되는 정보</h4>
            <ul className="warning-list">
              <li>회원 정보 및 프로필</li>
              <li>주문 내역 및 포인트</li>
              <li>찜 목록 및 작성한 리뷰</li>
              <li>배송지 정보</li>
            </ul>
            <p className="warning-notice">
              <strong>탈퇴 후에는 데이터를 복구할 수 없습니다.</strong>
            </p>
          </div>

          {/* Reason Selection */}
          <div className="reason-section">
            <label className="reason-label">
              탈퇴 사유 <span className="optional">(선택)</span>
            </label>
            <select
              className="reason-select"
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
            >
              <option value="">선택해주세요</option>
              {reasons.map((reason, index) => (
                <option key={index} value={reason}>
                  {reason}
                </option>
              ))}
            </select>

            {/* "기타" 선택 시 직접 입력 */}
            {selectedReason === '기타' && (
              <textarea
                className="other-reason-textarea"
                placeholder="탈퇴 사유를 입력해주세요"
                value={otherReasonDetail}
                onChange={(e) => setOtherReasonDetail(e.target.value)}
                rows={4}
              />
            )}
          </div>

          {/* Confirmation Checkbox */}
          <div className="confirmation-section">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span>위 내용을 확인했으며 탈퇴에 동의합니다</span>
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            취소
          </Button>
          <Button
            variant="danger"
            onClick={handleSubmit}
            disabled={!confirmed}
          >
            탈퇴하기
          </Button>
        </div>
      </div>
    </div>
  )
}
