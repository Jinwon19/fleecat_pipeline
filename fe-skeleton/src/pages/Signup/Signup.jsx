import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { toastOk, toastErr, toastLoading } from '../../lib/toast'
import './Signup.css'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [nickname, setNickname] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // 소셜 로그인 핸들러
  const handleSocialLogin = async (provider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/account`,
        },
      })

      if (error) {
        toastErr(`${provider} 회원가입 실패: ${error.message}`)
      }
    } catch (err) {
      toastErr('회원가입 중 문제가 발생했습니다.')
      console.error(err)
    }
  }

  // 유효성 검사 함수
  const validateForm = () => {
    const newErrors = {}

    // 이메일 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim()) {
      newErrors.email = '이메일을 입력하세요'
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = '올바른 이메일 형식이 아닙니다'
    }

    // 비밀번호 검증 (8자 이상, 영문+숫자 조합)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/
    if (!password.trim()) {
      newErrors.password = '비밀번호를 입력하세요'
    } else if (!passwordRegex.test(password.trim())) {
      newErrors.password = '비밀번호는 8자 이상, 영문+숫자 조합이어야 합니다'
    }

    // 비밀번호 확인
    if (!passwordConfirm.trim()) {
      newErrors.passwordConfirm = '비밀번호 확인을 입력하세요'
    } else if (password !== passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호가 일치하지 않습니다'
    }

    // 닉네임 검증 (2-10자)
    if (!nickname.trim()) {
      newErrors.nickname = '닉네임을 입력하세요'
    } else if (nickname.trim().length < 2 || nickname.trim().length > 10) {
      newErrors.nickname = '닉네임은 2-10자여야 합니다'
    }

    // 전화번호 검증 (필수)
    const phoneRegex = /^010-\d{4}-\d{4}$/
    if (!phone.trim()) {
      newErrors.phone = '전화번호를 입력하세요'
    } else if (!phoneRegex.test(phone.trim())) {
      newErrors.phone = '전화번호 형식: 010-0000-0000'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const onSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    const emailTrim = email.trim().toLowerCase()
    const passTrim  = password.trim()

    setLoading(true)
    try {
      await toastLoading(
        supabase.auth.signUp({ email: emailTrim, password: passTrim }),
        {
          loading: '가입 처리중…',
          success: '회원가입 성공! (인증 메일을 확인하세요)',
          error: '회원가입 실패'
        }
      ).then(({ data, error }) => {
        if (error) throw error
      })
      navigate('/account', { replace: true })
    } catch (err) {
      toastErr(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="signup-wrapper">
      <div className="signup-container">
        {/* 로고 */}
        <Link to="/" className="signup-logo">
          FleeCat
        </Link>

        {/* 회원가입 폼 */}
        <form onSubmit={onSubmit} className="signup-form">
          <div className="input-wrapper">
            <input
              type="email"
              autoComplete="email"
              placeholder="이메일"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              className={`signup-input ${errors.email ? 'error' : ''}`}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="input-wrapper">
            <input
              type="password"
              autoComplete="new-password"
              placeholder="비밀번호"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              className={`signup-input ${errors.password ? 'error' : ''}`}
            />
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <div className="input-wrapper">
            <input
              type="password"
              autoComplete="new-password"
              placeholder="비밀번호 확인"
              value={passwordConfirm}
              onChange={(e)=>setPasswordConfirm(e.target.value)}
              className={`signup-input ${errors.passwordConfirm ? 'error' : ''}`}
            />
            {errors.passwordConfirm && <span className="error-message">{errors.passwordConfirm}</span>}
          </div>

          <div className="input-wrapper">
            <input
              type="text"
              placeholder="닉네임"
              value={nickname}
              onChange={(e)=>setNickname(e.target.value)}
              className={`signup-input ${errors.nickname ? 'error' : ''}`}
            />
            {errors.nickname && <span className="error-message">{errors.nickname}</span>}
          </div>

          <div className="input-wrapper">
            <input
              type="tel"
              placeholder="전화번호"
              value={phone}
              onChange={(e)=>setPhone(e.target.value)}
              className={`signup-input ${errors.phone ? 'error' : ''}`}
            />
            {errors.phone && <span className="error-message">{errors.phone}</span>}
          </div>

          <button disabled={loading} className="signup-button">
            {loading ? '처리중...' : '회원가입'}
          </button>
        </form>

        <p className="signup-footer">
          이미 계정이 있나요? <Link to="/login">로그인</Link>
        </p>

        {/* 소셜 회원가입 아이콘 */}
        <div className="social-divider">또는 소셜 계정으로 가입하기</div>
        <div className="social-login-icons">
          <button
            type="button"
            onClick={() => handleSocialLogin('google')}
            className="social-icon-button social-icon-google"
            aria-label="구글 회원가입"
          >
            G
          </button>
          <button
            type="button"
            onClick={() => handleSocialLogin('kakao')}
            className="social-icon-button social-icon-kakao"
            aria-label="카카오 회원가입"
          >
            K
          </button>
          <button
            type="button"
            onClick={() => handleSocialLogin('apple')}
            className="social-icon-button social-icon-apple"
            aria-label="애플 회원가입"
          >
            A
          </button>
          <button
            type="button"
            onClick={() => handleSocialLogin('naver')}
            className="social-icon-button social-icon-naver"
            aria-label="네이버 회원가입"
          >
            N
          </button>
        </div>
      </div>
    </div>
  )
}
