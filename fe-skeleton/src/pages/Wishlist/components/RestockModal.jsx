import { useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import './RestockModal.css'

export default function RestockModal({ product, onClose, onConfirm }) {
  const { user } = useAuth()
  const [selectedOption, setSelectedOption] = useState(null)
  const [notificationMethods, setNotificationMethods] = useState({
    email: true,
    sms: false,
  })
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // 임시 옵션 데이터
  const options = product.hasOptions
    ? [
        { id: 'opt1', name: 'S - 블랙' },
        { id: 'opt2', name: 'M - 블랙' },
        { id: 'opt3', name: 'L - 화이트' },
      ]
    : []

  const handleMethodToggle = (method) => {
    setNotificationMethods((prev) => ({ ...prev, [method]: !prev[method] }))
  }

  const handleSubmit = () => {
    if (product.hasOptions && !selectedOption) {
      alert('옵션을 선택해주세요')
      return
    }

    if (!notificationMethods.email && !notificationMethods.sms) {
      alert('알림 수신 방법을 하나 이상 선택해주세요')
      return
    }

    if (!agreedToTerms) {
      alert('개인정보 수집 및 이용에 동의해주세요')
      return
    }

    const methods = []
    if (notificationMethods.email) methods.push('email')
    if (notificationMethods.sms) methods.push('sms')

    onConfirm({
      productId: product.productId,
      optionId: selectedOption,
      notificationMethods: methods,
      email: user.email,
      phone: user.phone || '',
    })
  }

  return (
    <div className="restock-modal-overlay" onClick={onClose}>
      <div className="restock-modal" onClick={(e) => e.stopPropagation()}>
        <div className="restock-modal__header">
          <h3>재입고 알림 신청</h3>
          <button className="restock-modal__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="restock-modal__body">
          {/* 상품 정보 */}
          <div className="restock-modal__product">
            <img src={product.thumbnailUrl} alt={product.productName} />
            <div>
              <p className="restock-modal__product-brand">{product.brandName}</p>
              <p className="restock-modal__product-name">{product.productName}</p>
              <p className="restock-modal__product-price">{product.price.toLocaleString()}원</p>
            </div>
          </div>

          {/* 옵션 선택 (있는 경우) */}
          {product.hasOptions && (
            <div className="restock-modal__option">
              <label>옵션 선택</label>
              <select value={selectedOption || ''} onChange={(e) => setSelectedOption(e.target.value)}>
                <option value="">선택하세요</option>
                {options.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 알림 수신 방법 */}
          <div className="restock-modal__methods">
            <label>알림 수신 방법</label>
            <div className="restock-modal__method-list">
              <label className="restock-modal__method">
                <input
                  type="checkbox"
                  checked={notificationMethods.email}
                  onChange={() => handleMethodToggle('email')}
                />
                <span>이메일 ({user?.email || '미등록'})</span>
              </label>
              <label className="restock-modal__method">
                <input
                  type="checkbox"
                  checked={notificationMethods.sms}
                  onChange={() => handleMethodToggle('sms')}
                />
                <span>SMS ({user?.phone || '미등록'})</span>
              </label>
            </div>
          </div>

          {/* 개인정보 동의 */}
          <div className="restock-modal__terms">
            <label>
              <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} />
              <span>개인정보 수집 및 이용에 동의합니다 (필수)</span>
            </label>
            <p className="restock-modal__terms-desc">
              재입고 알림을 위해 이메일 주소 및 휴대폰 번호가 수집됩니다. 알림 발송 후 즉시 파기됩니다.
            </p>
          </div>
        </div>

        <div className="restock-modal__footer">
          <button className="restock-modal__btn restock-modal__btn--submit" onClick={handleSubmit}>
            신청하기
          </button>
        </div>
      </div>
    </div>
  )
}
