import { useState } from 'react'
import { mockProductOptions } from '../../../mocks/wishlistMockData'
import './OptionModal.css'

export default function OptionModal({ product, onClose, onConfirm }) {
  const [selectedOptions, setSelectedOptions] = useState({})
  const [quantity, setQuantity] = useState(1)

  // 옵션 데이터 (더미 또는 실제 데이터)
  const mockOptions = mockProductOptions[product.productId]
  const options = mockOptions?.options || product.options || [
    { name: '사이즈', values: ['S', 'M', 'L', 'XL'] },
    { name: '색상', values: ['블랙', '화이트', '그레이'] },
  ]

  // 재고 데이터
  const stocks = mockOptions?.stocks || []

  const handleOptionChange = (optionName, value) => {
    setSelectedOptions((prev) => ({ ...prev, [optionName]: value }))
  }

  // 선택된 옵션 조합의 재고 확인
  const isOutOfStock = () => {
    if (stocks.length === 0) return false

    const allSelected = options.every((opt) => selectedOptions[opt.name])
    if (!allSelected) return false

    const selectedValues = options.map((opt) => selectedOptions[opt.name])
    const stock = stocks.find((s) => {
      return s.options.every((opt, i) => opt === selectedValues[i])
    })

    return stock ? stock.quantity === 0 : true
  }

  const handleConfirm = (action) => {
    // 필수 옵션 체크
    const allSelected = options.every((opt) => selectedOptions[opt.name])
    if (!allSelected) {
      alert('모든 옵션을 선택해주세요')
      return
    }

    // 품절 체크
    if (isOutOfStock()) {
      alert('선택하신 옵션은 품절되었습니다')
      return
    }

    onConfirm({ options: selectedOptions, quantity, action })
  }

  return (
    <div className="option-modal-overlay" onClick={onClose}>
      <div className="option-modal" onClick={(e) => e.stopPropagation()}>
        <div className="option-modal__header">
          <h3>옵션 선택</h3>
          <button className="option-modal__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="option-modal__body">
          {/* 상품 정보 */}
          <div className="option-modal__product">
            <img src={product.thumbnailUrl} alt={product.productName} />
            <div>
              <p className="option-modal__product-brand">{product.brandName}</p>
              <p className="option-modal__product-name">{product.productName}</p>
              <p className="option-modal__product-price">{product.price.toLocaleString()}원</p>
            </div>
          </div>

          {/* 옵션 선택 */}
          {options.map((option) => (
            <div key={option.name} className="option-modal__option">
              <label>{option.name}</label>
              <select value={selectedOptions[option.name] || ''} onChange={(e) => handleOptionChange(option.name, e.target.value)}>
                <option value="">선택하세요</option>
                {option.values.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {/* 수량 선택 */}
          <div className="option-modal__quantity">
            <label>수량</label>
            <div className="option-modal__quantity-controls">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)}>+</button>
            </div>
          </div>
        </div>

        <div className="option-modal__footer">
          <button className="option-modal__btn option-modal__btn--cart" onClick={() => handleConfirm('cart')}>
            장바구니 담기
          </button>
          <button className="option-modal__btn option-modal__btn--buy" onClick={() => handleConfirm('buy')}>
            바로 구매
          </button>
        </div>
      </div>
    </div>
  )
}
