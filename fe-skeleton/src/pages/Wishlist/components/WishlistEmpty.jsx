import { useNavigate } from 'react-router-dom'
import './WishlistEmpty.css'

export default function WishlistEmpty({ message, subMessage }) {
  const navigate = useNavigate()

  return (
    <div className="wishlist-empty">
      <div className="wishlist-empty__content">
        {/* 아이콘 */}
        <div className="wishlist-empty__icon">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M40 70C56.5685 70 70 56.5685 70 40C70 23.4315 56.5685 10 40 10C23.4315 10 10 23.4315 10 40C10 56.5685 23.4315 70 40 70Z"
              stroke="#E0E0E0"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M40 26V48.5L53 40"
              stroke="#E0E0E0"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M27 40L40 48.5"
              stroke="#E0E0E0"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* 메시지 */}
        <h2 className="wishlist-empty__title">{message || '찜한 상품이 없습니다'}</h2>
        <p className="wishlist-empty__subtitle">{subMessage || '마음에 드는 상품을 찜해보세요'}</p>

        {/* CTA 버튼 */}
        <button className="wishlist-empty__cta" onClick={() => navigate('/')}>
          쇼핑 계속하기
        </button>
      </div>
    </div>
  )
}
