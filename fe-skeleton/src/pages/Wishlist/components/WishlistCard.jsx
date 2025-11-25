import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, ShoppingCart } from 'lucide-react'
import './WishlistCard.css'

export default function WishlistCard({
  item,
  isEditMode,
  onToggleSelect,
  isSelected,
  onRemove,
  onAddToCart
}) {
  const navigate = useNavigate()
  const [isRemoving, setIsRemoving] = useState(false)

  const handleCardClick = () => {
    if (isEditMode) {
      onToggleSelect?.(item.wishlistId)
    } else {
      navigate(`/products/${item.productId}`)
    }
  }

  const handleHeartClick = (e) => {
    e.stopPropagation()
    if (!isEditMode) {
      setIsRemoving(true)
      onRemove?.(item.wishlistId)
    }
  }

  const handleCartClick = (e) => {
    e.stopPropagation()
    onAddToCart?.(item)
  }

  const handleRestockClick = (e) => {
    e.stopPropagation()
    onAddToCart?.(item)
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ko-KR').format(price)
  }

  // 할인율 계산
  const discountRate = item.originalPrice
    ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
    : 0

  return (
    <div
      className={`wishlist-card ${isEditMode ? 'wishlist-card--edit-mode' : ''} ${isRemoving ? 'wishlist-card--removing' : ''}`}
      onClick={handleCardClick}
    >
      {/* 이미지 영역 */}
      <div className="wishlist-card__image-wrapper">
        <img
          src={item.thumbnailUrl}
          alt={item.productName}
          loading="lazy"
          className={`wishlist-card__image ${item.isSoldOut ? 'wishlist-card__image--soldout' : ''}`}
        />

        {/* 좌측 상단: 할인율 뱃지 */}
        {!item.isSoldOut && discountRate > 0 && (
          <div className="wishlist-card__discount-badge">
            {discountRate}%
          </div>
        )}

        {/* 우측 상단: 찜 해제 버튼 or 체크박스 */}
        <div className="wishlist-card__top-right">
          {isEditMode ? (
            <input
              type="checkbox"
              className="wishlist-card__checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect?.(item.wishlistId)}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <button className="wishlist-card__heart-btn" onClick={handleHeartClick}>
              <Heart className="wishlist-card__heart-icon" fill="currentColor" />
            </button>
          )}
        </div>

        {/* 품절 오버레이 */}
        {item.isSoldOut && (
          <div className="wishlist-card__soldout-overlay">
            <span className="wishlist-card__soldout-text">품절</span>
          </div>
        )}
      </div>

      {/* 정보 영역 */}
      <div className="wishlist-card__info">
        {/* 브랜드명 */}
        {item.brandName && (
          <p className="wishlist-card__brand">{item.brandName}</p>
        )}

        {/* 상품명 */}
        <h3 className="wishlist-card__name">{item.productName}</h3>

        {/* 가격 */}
        <div className="wishlist-card__price-wrapper">
          <span className="wishlist-card__price">{formatPrice(item.price)}원</span>
          {item.originalPrice && item.originalPrice > item.price && (
            <span className="wishlist-card__original-price">
              {formatPrice(item.originalPrice)}원
            </span>
          )}
        </div>

        {/* 배송 정보 */}
        {(item.isFreeShipping || item.isTodayShipping) && (
          <p className="wishlist-card__shipping">
            {item.isFreeShipping && '무료배송'}
            {item.isFreeShipping && item.isTodayShipping && ' · '}
            {item.isTodayShipping && '오늘출발'}
          </p>
        )}
      </div>

      {/* 액션 버튼 */}
      {!isEditMode && (
        <div className="wishlist-card__actions">
          {item.isSoldOut ? (
            <button className="wishlist-card__action-btn wishlist-card__action-btn--soldout" onClick={handleRestockClick}>
              재입고 알림
            </button>
          ) : (
            <button className="wishlist-card__action-btn" onClick={handleCartClick}>
              <ShoppingCart className="wishlist-card__cart-icon" />
              장바구니
            </button>
          )}
        </div>
      )}
    </div>
  )
}
