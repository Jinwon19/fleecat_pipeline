// src/pages/Wishlist/Wishlist.jsx
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { fetchWishlist, removeFromWishlist, bulkRemoveFromWishlist } from '../../api/wishlist'
import { addToCart, bulkAddToCart } from '../../api/cart'
import { subscribeRestockNotification } from '../../api/restock'
import { toastOk, toastErr, toastLoading } from '../../lib/toast'
import WishlistCard from './components/WishlistCard'
import WishlistEmpty from './components/WishlistEmpty'
import WishlistSkeleton from './components/WishlistSkeleton'
import OptionModal from './components/OptionModal'
import RestockModal from './components/RestockModal'
import { mockWishlistData } from '../../mocks/wishlistMockData'
import './Wishlist.css'

// 개발 모드 토글 (true: 더미 데이터, false: 실제 API)
const USE_MOCK_DATA = true

export default function Wishlist() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [wishlistItems, setWishlistItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('latest')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedItems, setSelectedItems] = useState([])
  const [optionModalProduct, setOptionModalProduct] = useState(null)
  const [restockModalProduct, setRestockModalProduct] = useState(null)

  // 찜 목록 불러오기
  const loadWishlist = async () => {
    // 더미 데이터 모드
    if (USE_MOCK_DATA) {
      try {
        setLoading(true)
        // 0.5초 로딩 시뮬레이션
        await new Promise((resolve) => setTimeout(resolve, 500))
        setWishlistItems(mockWishlistData)
      } catch (error) {
        toastErr('데이터를 불러오는데 실패했습니다')
      } finally {
        setLoading(false)
      }
      return
    }

    // 실제 API 모드
    if (!user) return

    try {
      setLoading(true)
      const items = await fetchWishlist(user.id, {
        sort: sortBy,
        category: filterCategory,
        status: filterStatus,
      })
      setWishlistItems(items)
    } catch (error) {
      toastErr(error.message || '찜 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 초기 로드 및 필터/정렬 변경 시 재로드
  useEffect(() => {
    loadWishlist()
  }, [user, sortBy, filterCategory, filterStatus])

  // 정렬 및 필터링된 데이터
  const filteredAndSortedItems = useMemo(() => {
    let items = [...wishlistItems]

    // 더미 데이터 모드에서는 클라이언트에서 필터/정렬
    if (USE_MOCK_DATA) {
      // 카테고리 필터
      if (filterCategory !== 'all') {
        items = items.filter((item) => item.category === filterCategory)
      }

      // 상태 필터
      if (filterStatus === 'available') {
        items = items.filter((item) => !item.isSoldOut)
      } else if (filterStatus === 'soldout') {
        items = items.filter((item) => item.isSoldOut)
      }

      // 정렬
      if (sortBy === 'latest') {
        items.sort((a, b) => new Date(b.wishlistedAt) - new Date(a.wishlistedAt))
      } else if (sortBy === 'price_asc') {
        items.sort((a, b) => a.price - b.price)
      } else if (sortBy === 'price_desc') {
        items.sort((a, b) => b.price - a.price)
      } else if (sortBy === 'discount') {
        items.sort((a, b) => {
          const discountA = a.originalPrice ? ((a.originalPrice - a.price) / a.originalPrice) * 100 : 0
          const discountB = b.originalPrice ? ((b.originalPrice - b.price) / b.originalPrice) * 100 : 0
          return discountB - discountA
        })
      }
    }

    return items
  }, [wishlistItems, filterCategory, filterStatus, sortBy])

  // 정렬 옵션을 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('wishlist_sort', sortBy)
  }, [sortBy])

  // 컴포넌트 마운트 시 localStorage에서 정렬 옵션 불러오기
  useEffect(() => {
    const savedSort = localStorage.getItem('wishlist_sort')
    if (savedSort) {
      setSortBy(savedSort)
    }
  }, [])

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (selectedItems.length === filteredAndSortedItems.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredAndSortedItems.map((item) => item.wishlistId))
    }
  }

  // 선택 삭제
  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return

    const confirmDelete = window.confirm(`선택한 상품 ${selectedItems.length}개를 삭제하시겠습니까?`)
    if (!confirmDelete) return

    // 더미 데이터 모드
    if (USE_MOCK_DATA) {
      setWishlistItems((prev) => prev.filter((item) => !selectedItems.includes(item.wishlistId)))
      setSelectedItems([])
      toastOk(`${selectedItems.length}개 상품이 삭제되었습니다`)
      return
    }

    // 실제 API 모드
    try {
      await toastLoading(bulkRemoveFromWishlist(selectedItems), {
        loading: '삭제 중...',
        success: `${selectedItems.length}개 상품이 삭제되었습니다`,
        error: '삭제에 실패했습니다',
      })

      setWishlistItems((prev) => prev.filter((item) => !selectedItems.includes(item.wishlistId)))
      setSelectedItems([])
    } catch (error) {
      console.error(error)
    }
  }

  // 선택 상품 장바구니 담기
  const handleBulkAddToCart = async () => {
    if (selectedItems.length === 0) return

    const selectedProducts = filteredAndSortedItems.filter((item) => selectedItems.includes(item.wishlistId))

    // 품절 상품 제외
    const availableProducts = selectedProducts.filter((item) => !item.isSoldOut)

    if (availableProducts.length === 0) {
      toastErr('품절된 상품은 장바구니에 담을 수 없습니다')
      return
    }

    // 옵션이 필요한 상품 확인
    const hasOptionsProducts = availableProducts.filter((item) => item.hasOptions)
    if (hasOptionsProducts.length > 0) {
      toastErr('옵션 선택이 필요한 상품이 있습니다. 개별적으로 선택해주세요.')
      return
    }

    // 더미 데이터 모드
    if (USE_MOCK_DATA) {
      toastOk(`${availableProducts.length}개 상품을 장바구니에 담았습니다`)
      setIsEditMode(false)
      setSelectedItems([])
      return
    }

    // 실제 API 모드
    try {
      const items = availableProducts.map((item) => ({
        productId: item.productId,
        quantity: 1,
      }))

      await toastLoading(bulkAddToCart(user.id, items), {
        loading: '장바구니에 담는 중...',
        success: `${items.length}개 상품을 장바구니에 담았습니다`,
        error: '장바구니 담기에 실패했습니다',
      })

      setIsEditMode(false)
      setSelectedItems([])
    } catch (error) {
      console.error(error)
    }
  }

  // 편집 모드 종료 시 선택 초기화
  useEffect(() => {
    if (!isEditMode) {
      setSelectedItems([])
    }
  }, [isEditMode])

  const handleToggleSelect = (wishlistId) => {
    setSelectedItems((prev) =>
      prev.includes(wishlistId)
        ? prev.filter((id) => id !== wishlistId)
        : [...prev, wishlistId]
    )
  }

  const handleRemove = async (wishlistId) => {
    // 더미 데이터 모드
    if (USE_MOCK_DATA) {
      setWishlistItems((prev) => prev.filter((item) => item.wishlistId !== wishlistId))
      toastOk('찜을 해제했습니다')
      return
    }

    // 실제 API 모드
    try {
      await removeFromWishlist(wishlistId)
      setWishlistItems((prev) => prev.filter((item) => item.wishlistId !== wishlistId))
      toastOk('찜을 해제했습니다')
    } catch (error) {
      toastErr(error.message || '찜 해제에 실패했습니다')
    }
  }

  // 개별 장바구니 담기
  const handleAddToCart = (item) => {
    // 품절 상품은 재입고 알림 모달 표시
    if (item.isSoldOut) {
      setRestockModalProduct(item)
      return
    }

    // 옵션이 필요한 상품
    if (item.hasOptions) {
      setOptionModalProduct(item)
    } else {
      // 옵션이 없는 상품은 바로 담기
      addToCartDirectly(item.productId, 1, null)
    }
  }

  // 옵션 선택 후 장바구니 담기
  const handleOptionConfirm = async ({ options, quantity, action }) => {
    if (action === 'cart') {
      await addToCartDirectly(optionModalProduct.productId, quantity, options)
    } else if (action === 'buy') {
      await addToCartDirectly(optionModalProduct.productId, quantity, options)
      navigate('/cart')
    }
    setOptionModalProduct(null)
  }

  // 실제 장바구니 담기 함수
  const addToCartDirectly = async (productId, quantity, options) => {
    // 더미 데이터 모드
    if (USE_MOCK_DATA) {
      toastOk('장바구니에 담았습니다')
      return
    }

    // 실제 API 모드
    try {
      await toastLoading(addToCart(user.id, productId, quantity, options), {
        loading: '장바구니에 담는 중...',
        success: '장바구니에 담았습니다',
        error: '장바구니 담기에 실패했습니다',
      })
    } catch (error) {
      console.error(error)
    }
  }

  // 재입고 알림 신청
  const handleRestockConfirm = async (data) => {
    // 더미 데이터 모드
    if (USE_MOCK_DATA) {
      toastOk('재입고 알림이 신청되었습니다')
      setRestockModalProduct(null)
      return
    }

    // 실제 API 모드
    try {
      await toastLoading(subscribeRestockNotification({ ...data, userId: user.id }), {
        loading: '재입고 알림을 신청하는 중...',
        success: '재입고 알림이 신청되었습니다',
        error: '재입고 알림 신청에 실패했습니다',
      })
      setRestockModalProduct(null)
    } catch (error) {
      console.error(error)
    }
  }

  if (loading) {
    return (
      <div className="wishlist-page">
        <div className="wrap">
          <WishlistSkeleton count={10} />
        </div>
      </div>
    )
  }

  return (
    <div className={`wishlist-page ${isEditMode ? 'edit-mode' : ''}`} role="main" aria-label="찜한 상품 페이지">
      <div className="wrap">
        {/* 헤더 영역 */}
        <div className="wishlist-header">
          <div className="wishlist-header__left">
            <h1 id="wishlist-title" className="wishlist-header__title">
              찜한 상품 <span className="wishlist-header__count">{wishlistItems.length}개</span>
            </h1>
          </div>

          <div className="wishlist-header__right">
            {/* 정렬 옵션 */}
            <label htmlFor="sort-select" className="sr-only">정렬 방식</label>
            <select
              id="sort-select"
              className="wishlist-header__sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="상품 정렬 선택"
            >
              <option value="latest">최신순</option>
              <option value="price_asc">낮은 가격순</option>
              <option value="price_desc">높은 가격순</option>
              <option value="discount">할인율순</option>
            </select>

            {/* 편집 버튼 */}
            <button
              className="wishlist-header__edit-btn"
              onClick={() => setIsEditMode(!isEditMode)}
              aria-pressed={isEditMode}
              aria-label={isEditMode ? '편집 완료' : '편집 모드 진입'}
            >
              {isEditMode ? '완료' : '편집'}
            </button>
          </div>
        </div>

        {/* 필터 영역 */}
        <div className="wishlist-filters">
          {/* 카테고리 탭 */}
          <div className="wishlist-filters__tabs">
            <button
              className={`wishlist-filters__tab ${filterCategory === 'all' ? 'active' : ''}`}
              onClick={() => setFilterCategory('all')}
            >
              전체
            </button>
            <button
              className={`wishlist-filters__tab ${filterCategory === 'fashion' ? 'active' : ''}`}
              onClick={() => setFilterCategory('fashion')}
            >
              패션
            </button>
            <button
              className={`wishlist-filters__tab ${filterCategory === 'beauty' ? 'active' : ''}`}
              onClick={() => setFilterCategory('beauty')}
            >
              뷰티
            </button>
            <button
              className={`wishlist-filters__tab ${filterCategory === 'living' ? 'active' : ''}`}
              onClick={() => setFilterCategory('living')}
            >
              리빙
            </button>
          </div>

          {/* 상태 필터 */}
          <div className="wishlist-filters__status">
            <label className={`wishlist-filters__radio ${filterStatus === 'all' ? 'active' : ''}`}>
              <input
                type="radio"
                name="status"
                value="all"
                checked={filterStatus === 'all'}
                onChange={() => setFilterStatus('all')}
              />
              전체
            </label>
            <label className={`wishlist-filters__radio ${filterStatus === 'available' ? 'active' : ''}`}>
              <input
                type="radio"
                name="status"
                value="available"
                checked={filterStatus === 'available'}
                onChange={() => setFilterStatus('available')}
              />
              판매중
            </label>
            <label className={`wishlist-filters__radio ${filterStatus === 'soldout' ? 'active' : ''}`}>
              <input
                type="radio"
                name="status"
                value="soldout"
                checked={filterStatus === 'soldout'}
                onChange={() => setFilterStatus('soldout')}
              />
              품절
            </label>
          </div>
        </div>

        {/* 리스트 영역 */}
        {filteredAndSortedItems.length > 0 ? (
          <div className="wishlist-grid" role="list" aria-labelledby="wishlist-title">
            {filteredAndSortedItems.map((item) => (
              <WishlistCard
                key={item.wishlistId}
                item={item}
                isEditMode={isEditMode}
                onToggleSelect={handleToggleSelect}
                isSelected={selectedItems.includes(item.wishlistId)}
                onRemove={handleRemove}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        ) : (
          <WishlistEmpty
            message={
              filterCategory !== 'all' || filterStatus !== 'all'
                ? '조건에 맞는 상품이 없습니다'
                : '찜한 상품이 없습니다'
            }
            subMessage={
              filterCategory !== 'all' || filterStatus !== 'all'
                ? '다른 필터를 선택해보세요'
                : '마음에 드는 상품을 찜해보세요'
            }
          />
        )}
      </div>

      {/* 편집 모드 하단 액션 바 */}
      {isEditMode && (
        <div className="wishlist-action-bar">
          <div className="wrap">
            <div className="wishlist-action-bar__inner">
              {/* 전체 선택 */}
              <label className="wishlist-action-bar__select-all">
                <input
                  type="checkbox"
                  checked={selectedItems.length === filteredAndSortedItems.length && filteredAndSortedItems.length > 0}
                  onChange={handleSelectAll}
                />
                <span>전체 선택</span>
              </label>

              {/* 액션 버튼 */}
              <div className="wishlist-action-bar__buttons">
                <button
                  className="wishlist-action-bar__btn wishlist-action-bar__btn--delete"
                  disabled={selectedItems.length === 0}
                  onClick={handleBulkDelete}
                >
                  선택 삭제 {selectedItems.length > 0 && `(${selectedItems.length})`}
                </button>
                <button
                  className="wishlist-action-bar__btn wishlist-action-bar__btn--cart"
                  disabled={
                    selectedItems.length === 0 ||
                    filteredAndSortedItems.filter((item) => selectedItems.includes(item.wishlistId) && !item.isSoldOut)
                      .length === 0
                  }
                  onClick={handleBulkAddToCart}
                >
                  장바구니 담기 {selectedItems.length > 0 && `(${selectedItems.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 옵션 선택 모달 */}
      {optionModalProduct && (
        <OptionModal product={optionModalProduct} onClose={() => setOptionModalProduct(null)} onConfirm={handleOptionConfirm} />
      )}

      {/* 재입고 알림 모달 */}
      {restockModalProduct && (
        <RestockModal
          product={restockModalProduct}
          onClose={() => setRestockModalProduct(null)}
          onConfirm={handleRestockConfirm}
        />
      )}
    </div>
  )
}
