// src/contexts/UserRoleContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabaseClient'

const UserRoleContext = createContext(null)

const ACTIVE_MODE_KEY = 'userActiveMode'

export function UserRoleProvider({ children }) {
  const { user } = useAuth()
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)

  const [activeMode, setActiveModeState] = useState(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_MODE_KEY)
      return saved || 'buyer'
    } catch {
      return 'buyer'
    }
  })

  const setActiveMode = (mode) => {
    try {
      localStorage.setItem(ACTIVE_MODE_KEY, mode)
    } catch (error) {
      console.error('모드 저장 오류:', error)
    }
    setActiveModeState(mode)
  }

  useEffect(() => {
    const fetchRoles = async () => {
      if (!user?.id) {
        setLoading(false)
        return
      }

      try {
        // TODO: DB 연동 후 실제 데이터로 교체
        // const { data, error } = await supabase
        //   .from('member_permissions')
        //   .select('permission_role')
        //   .eq('member_id', user.id)
        // if (error) throw error
        // const userRoles = data?.map(r => r.permission_role) || []

        // 임시 더미 데이터 (buyer + seller 둘 다 있는 경우)
        const userRoles = ['buyer', 'seller']
        setRoles(userRoles)

        // localStorage에 저장된 모드가 유효한지 확인
        const savedMode = localStorage.getItem(ACTIVE_MODE_KEY)
        if (savedMode && userRoles.includes(savedMode)) {
          setActiveModeState(savedMode)
        } else {
          // 저장된 모드가 없거나 유효하지 않으면 buyer로 기본 설정
          setActiveMode('buyer')
        }
      } catch (error) {
        console.error('역할 조회 오류:', error)
        setRoles(['buyer']) // 기본값
        setActiveMode('buyer')
      } finally {
        setLoading(false)
      }
    }

    fetchRoles()
  }, [user?.id])

  const hasRole = (role) => roles.includes(role)
  const canSwitchMode = hasRole('buyer') && hasRole('seller')

  const value = {
    roles,
    activeMode,
    setActiveMode,
    hasRole,
    canSwitchMode,
    loading
  }

  return (
    <UserRoleContext.Provider value={value}>
      {children}
    </UserRoleContext.Provider>
  )
}

export function useUserRole() {
  const context = useContext(UserRoleContext)
  if (!context) {
    throw new Error('useUserRole must be used within UserRoleProvider')
  }
  return context
}
