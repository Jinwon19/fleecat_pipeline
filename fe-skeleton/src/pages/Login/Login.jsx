import { useRef, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { toastOk, toastErr } from '../../lib/toast'
import './Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/account'
  const pwRef = useRef(null)

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
        toastErr(`${provider} 로그인 실패: ${error.message}`)
      }
      // OAuth는 리다이렉트되므로 여기서 성공 처리 불가
    } catch (err) {
      toastErr('로그인 중 문제가 발생했습니다.')
      console.error(err)
    }
  }

  // 이메일/비밀번호 로그인 핸들러
  const onSubmit = async (e) => {
    e.preventDefault()

    const emailTrim = email.trim().toLowerCase()
    const passTrim  = password.trim()
    if (!emailTrim || !passTrim) return toastErr('이메일/비밀번호를 입력하세요')

    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailTrim,
        password: passTrim,
      })

      if (error) {
        if (error.message === 'Email not confirmed') {
          toastErr('이메일 인증이 필요합니다 📩')
        } else if (error.message === 'Invalid login credentials') {
          toastErr('이메일/비밀번호가 올바르지 않습니다')
        } else {
          toastErr(error)
        }
        setPassword('')
        pwRef.current?.focus()
        return
      }

      toastOk('로그인 성공!')
      navigate(from, { replace: true })
    } catch (err) {
      // 네트워크/기타 예외
      toastErr('로그인 중 문제가 발생했습니다. 잠시 후 다시 시도하세요.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrapper">
      {/* 로고 */}
      <Link to="/" className="login-logo">
        FleeCat
      </Link>

      <div className="login-container">
        {/* 소셜 로그인 아이콘 */}
        <div className="social-login-icons">
          <button
            type="button"
            onClick={() => handleSocialLogin('google')}
            className="social-icon-button social-icon-google"
            aria-label="구글 로그인"
          >
            G
          </button>
          <button
            type="button"
            onClick={() => handleSocialLogin('kakao')}
            className="social-icon-button social-icon-kakao"
            aria-label="카카오 로그인"
          >
            K
          </button>
          <button
            type="button"
            onClick={() => handleSocialLogin('apple')}
            className="social-icon-button social-icon-apple"
            aria-label="애플 로그인"
          >
            A
          </button>
          <button
            type="button"
            onClick={() => handleSocialLogin('naver')}
            className="social-icon-button social-icon-naver"
            aria-label="네이버 로그인"
          >
            N
          </button>
        </div>

        {/* 구분선 */}
        <div className="login-divider">
          <span>또는</span>
        </div>

        {/* 이메일/비밀번호 로그인 */}
        <form onSubmit={onSubmit} className="login-form">
          <div className="input-wrapper">
            <input
              type="email"
              autoComplete="email"
              placeholder=" "
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              className="login-input"
              id="email-input"
            />
            <label htmlFor="email-input" className="floating-label">
              ID
            </label>
          </div>
          <div className="input-wrapper">
            <input
              ref={pwRef}
              type="password"
              autoComplete="current-password"
              placeholder=" "
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              className="login-input"
              id="password-input"
            />
            <label htmlFor="password-input" className="floating-label">
              Password
            </label>
          </div>
          <button disabled={loading} className="login-button">
            {loading ? '처리중...' : '로그인'}
          </button>
        </form>

        <p className="login-footer">
          아직 계정이 없나요? <Link to="/signup">회원가입</Link>
        </p>
      </div>
    </div>
  )
}
