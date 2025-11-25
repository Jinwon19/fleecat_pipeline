import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { toastLoading, toastErr } from '../../lib/toast'
import { useAuth } from '../../contexts/AuthContext'
import { useUserRole } from '../../contexts/UserRoleContext'
import '../../styles/Layout.css'
import './Header.css'

export default function Header() {
  const navigate = useNavigate()
  const { user, loading, signOut } = useAuth()
  const { activeMode, setActiveMode, canSwitchMode, loading: roleLoading } = useUserRole()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const onLogout = async () => {
    try {
      await toastLoading(
        signOut(),
        { loading: '로그아웃 중…', success: '로그아웃 완료', error: '로그아웃 실패' }
      )
      navigate('/login', { replace: true })
    } catch (err) {
      toastErr(err?.message || String(err))
    }
  }

  const handleModeSwitch = () => {
    const newMode = activeMode === 'buyer' ? 'seller' : 'buyer'
    setActiveMode(newMode)
    setIsDropdownOpen(false)
  }

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  return (
    <header className="header">
      <div className="wrap">
        <div className="header__inner">
          {/* 왼쪽: 앱 설치 */}
          <div className="header__left">
            <a href="#" className="header__link">앱 설치</a>
          </div>

          {/* 오른쪽: 로그인 상태에 따른 링크들 */}
          <div className="header__right">
            {loading ? (
              <span className="header__loading">로그인 확인 중…</span>
            ) : user ? (
              <>
                <div className="header__user-wrapper" ref={dropdownRef}>
                  <span
                    className="header__user-info"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    {user.email}
                  </span>

                  {isDropdownOpen && (
                    <div className="header__dropdown">
                      <NavLink
                        to="/account"
                        className="header__dropdown-item"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        내 정보
                      </NavLink>

                      {canSwitchMode && !roleLoading && (
                        <button
                          className="header__dropdown-item header__dropdown-button"
                          onClick={handleModeSwitch}
                        >
                          {activeMode === 'buyer' ? '판매자로 전환' : '구매자로 전환'}
                        </button>
                      )}

                      <a
                        href="#"
                        className="header__dropdown-item"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        고객센터
                      </a>

                      <button
                        className="header__dropdown-item header__dropdown-button"
                        onClick={onLogout}
                      >
                        로그아웃
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <a href="#" className="header__link">고객센터</a>
                <NavLink to="/login" className="header__link">로그인</NavLink>
                <NavLink to="/signup" className="header__link header__link--signup">회원가입</NavLink>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}