import { useState } from 'react'
import { useAuth } from '../../../../contexts/AuthContext'
import { toastOk } from '../../../../lib/toast'
import InfoModal from '../../../../components/InfoModal'
import PasswordChangeModal from '../PasswordChangeModal'
import DeleteAccountModal from '../DeleteAccountModal'
import './Settings.css'

export default function Settings() {
  const { user } = useAuth()
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)

  const handleChangePassword = () => {
    // Mock 처리: 실제 API 호출 대신 안내 모달 표시
    setShowPasswordModal(false)
    setShowInfoModal(true)
  }

  const handleDeleteAccount = (reason, detail) => {
    // Mock 처리: localStorage에 탈퇴 사유 저장 (Analytics 스텁)
    try {
      const withdrawalData = {
        reason: reason,
        detail: detail || null,
        timestamp: new Date().toISOString()
      }

      localStorage.setItem('withdrawal_reason', JSON.stringify(withdrawalData))

      toastOk('계정 탈퇴가 처리되었습니다 (Mock)')
      setShowDeleteModal(false)

      // Mock이므로 실제 로그아웃은 하지 않음
      console.log('회원 탈퇴 사유 저장됨:', withdrawalData)
    } catch (error) {
      console.error('탈퇴 사유 저장 오류:', error)
    }
  }

  return (
    <div className="account-section">
      <h2 className="section-title">계정 관리</h2>
      <div className="settings-list">
        {user?.app_metadata?.provider === 'email' && (
          <button
            className="settings-item"
            onClick={() => setShowPasswordModal(true)}
          >
            비밀번호 변경
          </button>
        )}
        <button
          className="settings-item settings-item--danger"
          onClick={() => setShowDeleteModal(true)}
        >
          회원 탈퇴
        </button>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <PasswordChangeModal
          onClose={() => setShowPasswordModal(false)}
          onSubmit={handleChangePassword}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onSubmit={handleDeleteAccount}
        />
      )}

      {/* Info Modal */}
      {showInfoModal && (
        <InfoModal
          title="비밀번호 변경"
          message="실제 백엔드 연동 후 사용 가능합니다"
          onConfirm={() => setShowInfoModal(false)}
        />
      )}
    </div>
  )
}
