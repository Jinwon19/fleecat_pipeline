// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const loc = useLocation()

  if (loading) {
    return <div style={{ padding: 24 }}>로그인 확인 중…</div>
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc }} />
  }
  return children
}
