import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useUserRole } from './hooks/useUserRole'
import RoleSwitcher from './components/RoleSwitcher'

// Buyer (구매자) 컴포넌트
import Profile from './components/Profile'
import Address from './components/Address'
import Orders from './components/Orders'
import Settings from './components/Settings'

// Seller (판매자) 컴포넌트
import SellerDashboard from './components/Seller/SellerDashboard'
import SellerProducts from './components/Seller/SellerProducts'
import SellerOrders from './components/Seller/SellerOrders'
import SellerRevenue from './components/Seller/SellerRevenue'

import './Account.css'

export default function Account() {
  const { activeMode, setActiveMode, canSwitchMode, loading } = useUserRole()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => {
    // 초기 탭 설정: URL 파라미터 > localStorage 기반 기본값
    const tabParam = new URLSearchParams(window.location.search).get('tab')
    if (tabParam) return tabParam
    
    // localStorage에서 저장된 모드에 따라 기본 탭 설정
    try {
      const savedMode = localStorage.getItem('userActiveMode') || 'buyer'
      return savedMode === 'buyer' ? 'profile' : 'dashboard'
    } catch {
      return 'profile'
    }
  })

  // activeMode 또는 loading 상태 변경 시 탭 동기화
  useEffect(() => {
    if (loading) return // 로딩 중에는 탭 변경 안 함

    const tabParam = searchParams.get('tab')
    
    // URL에 탭 파라미터가 있으면 그것을 사용
    if (tabParam) {
      setActiveTab(tabParam)
      return
    }

    // URL에 탭 파라미터가 없으면 모드에 맞는 기본 탭으로 설정
    const defaultTab = activeMode === 'buyer' ? 'profile' : 'dashboard'
    setActiveTab(defaultTab)
    
    // URL 파라미터도 업데이트 (히스토리에 추가하지 않고 replace)
    setSearchParams({ tab: defaultTab }, { replace: true })
  }, [activeMode, loading, searchParams, setSearchParams])

  // 모드 변경 시 탭 초기화
  const handleModeChange = (newMode) => {
    setActiveMode(newMode)
    const defaultTab = newMode === 'buyer' ? 'profile' : 'dashboard'
    setActiveTab(defaultTab)
    setSearchParams({ tab: defaultTab })
  }

  // 탭 변경 핸들러
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  // 구매자 모드 콘텐츠
  const renderBuyerContent = () => {
    switch (activeTab) {
      case 'profile':
        return <Profile />
      case 'address':
        return <Address />
      case 'orders':
        return <Orders />
      case 'settings':
        return <Settings />
      default:
        // 유효하지 않은 탭인 경우 기본 탭으로 리다이렉트
        setActiveTab('profile')
        setSearchParams({ tab: 'profile' }, { replace: true })
        return <Profile />
    }
  }

  // 판매자 모드 콘텐츠
  const renderSellerContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <SellerDashboard />
      case 'products':
        return <SellerProducts />
      case 'seller-orders':
        return <SellerOrders />
      case 'revenue':
        return <SellerRevenue />
      case 'settings':
        return <Settings />
      default:
        // 유효하지 않은 탭인 경우 기본 탭으로 리다이렉트
        setActiveTab('dashboard')
        setSearchParams({ tab: 'dashboard' }, { replace: true })
        return <SellerDashboard />
    }
  }

  if (loading) {
    return (
      <div className="account-page">
        <div className="loading-state">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="account-page">
      {/* Desktop Sidebar Navigation */}
      <aside className="account-sidebar">
        {/* 역할 전환 버튼 (두 역할 모두 가진 경우만 표시) */}
        {canSwitchMode && (
          <RoleSwitcher activeMode={activeMode} onModeChange={handleModeChange} />
        )}

        <nav className="account-nav">
          {activeMode === 'buyer' ? (
            <>
              <button
                className={`nav-item ${activeTab === 'profile' ? 'nav-item--active' : ''}`}
                onClick={() => handleTabChange('profile')}
              >
                기본 정보
              </button>
              <button
                className={`nav-item ${activeTab === 'address' ? 'nav-item--active' : ''}`}
                onClick={() => handleTabChange('address')}
              >
                배송지 관리
              </button>
              <button
                className={`nav-item ${activeTab === 'orders' ? 'nav-item--active' : ''}`}
                onClick={() => handleTabChange('orders')}
              >
                주문 내역
              </button>
              <button
                className={`nav-item ${activeTab === 'settings' ? 'nav-item--active' : ''}`}
                onClick={() => handleTabChange('settings')}
              >
                계정 관리
              </button>
            </>
          ) : (
            <>
              <button
                className={`nav-item ${activeTab === 'dashboard' ? 'nav-item--active' : ''}`}
                onClick={() => handleTabChange('dashboard')}
              >
                대시보드
              </button>
              <button
                className={`nav-item ${activeTab === 'products' ? 'nav-item--active' : ''}`}
                onClick={() => handleTabChange('products')}
              >
                상품 관리
              </button>
              <button
                className={`nav-item ${activeTab === 'seller-orders' ? 'nav-item--active' : ''}`}
                onClick={() => handleTabChange('seller-orders')}
              >
                판매 주문
              </button>
              <button
                className={`nav-item ${activeTab === 'revenue' ? 'nav-item--active' : ''}`}
                onClick={() => handleTabChange('revenue')}
              >
                수익 관리
              </button>
              <button
                className={`nav-item ${activeTab === 'settings' ? 'nav-item--active' : ''}`}
                onClick={() => handleTabChange('settings')}
              >
                계정 관리
              </button>
            </>
          )}
        </nav>
      </aside>

      {/* Mobile Tab Navigation */}
      <div className="account-tabs">
        {/* 역할 전환 버튼 (모바일) */}
        {canSwitchMode && (
          <RoleSwitcher activeMode={activeMode} onModeChange={handleModeChange} />
        )}

        {activeMode === 'buyer' ? (
          <>
            <button
              className={`tab-item ${activeTab === 'profile' ? 'tab-item--active' : ''}`}
              onClick={() => handleTabChange('profile')}
            >
              기본 정보
            </button>
            <button
              className={`tab-item ${activeTab === 'address' ? 'tab-item--active' : ''}`}
              onClick={() => handleTabChange('address')}
            >
              배송지
            </button>
            <button
              className={`tab-item ${activeTab === 'orders' ? 'tab-item--active' : ''}`}
              onClick={() => handleTabChange('orders')}
            >
              주문 내역
            </button>
            <button
              className={`tab-item ${activeTab === 'settings' ? 'tab-item--active' : ''}`}
              onClick={() => handleTabChange('settings')}
            >
              계정
            </button>
          </>
        ) : (
          <>
            <button
              className={`tab-item ${activeTab === 'dashboard' ? 'tab-item--active' : ''}`}
              onClick={() => handleTabChange('dashboard')}
            >
              대시보드
            </button>
            <button
              className={`tab-item ${activeTab === 'products' ? 'tab-item--active' : ''}`}
              onClick={() => handleTabChange('products')}
            >
              상품 관리
            </button>
            <button
              className={`tab-item ${activeTab === 'seller-orders' ? 'tab-item--active' : ''}`}
              onClick={() => handleTabChange('seller-orders')}
            >
              판매 주문
            </button>
            <button
              className={`tab-item ${activeTab === 'revenue' ? 'tab-item--active' : ''}`}
              onClick={() => handleTabChange('revenue')}
            >
              수익
            </button>
            <button
              className={`tab-item ${activeTab === 'settings' ? 'tab-item--active' : ''}`}
              onClick={() => handleTabChange('settings')}
            >
              계정
            </button>
          </>
        )}
      </div>

      {/* Content Area */}
      <main className="account-content">
        {activeMode === 'buyer' ? renderBuyerContent() : renderSellerContent()}
      </main>
    </div>
  )
}
