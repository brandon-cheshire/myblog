import { createContext, useContext, useState } from 'react'
import type { User } from '../../api/tsrClient'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { tsrClient } from '../../api/tsrClient'
import type { ReactNode } from 'react'

const AUTH_ME_QUERY_KEY = ['auth', 'me'] as const

interface AuthContextType {
  user: User | null
  loading: boolean
  requiresTwoFactor: boolean
  tempCredentials: { email: string; password: string } | null
  login: (email: string, password: string) => Promise<void>
  authenticateTwoFactor: (code: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  setRequiresTwoFactor: (requires: boolean) => void
  setTempCredentials: (credentials: { email: string; password: string } | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const getCurrentUserQuery = tsrClient.auth.getCurrentUser.useQuery({
    queryKey: AUTH_ME_QUERY_KEY,
    queryData: {},
    staleTime: 30_000,
    refetchOnMount: false,
  })

  const loginMutation = tsrClient.auth.login.useMutation({
    onSuccess: (res) => {
      const body = res.body as { token?: string }
      if (body.token) localStorage.setItem('auth-token', body.token)
    },
  })

  const registerMutation = tsrClient.auth.register.useMutation({
    onSuccess: (res) => {
      const body = res.body as { token?: string }
      if (body.token) localStorage.setItem('auth-token', body.token)
    },
  })

  const authenticateTwoFactorMutation = tsrClient.auth.authenticateTwoFactor.useMutation({
    onSuccess: (res) => {
      const body = res.body as { token?: string }
      if (body.token) localStorage.setItem('auth-token', body.token)
    },
  })

  const logoutMutation = tsrClient.auth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem('auth-token')
    },
  })

  const user = getCurrentUserQuery.data?.body ?? null
  const loading = getCurrentUserQuery.isLoading

  const [requiresTwoFactorState, setRequiresTwoFactorState] = useState(false)
  const [tempCredentialsState, setTempCredentialsState] = useState<{ email: string; password: string } | null>(null)

  const setRequiresTwoFactor = (requires: boolean) => setRequiresTwoFactorState(requires)
  const setTempCredentials = (credentials: { email: string; password: string } | null) =>
    setTempCredentialsState(credentials)

  const login = async (email: string, password: string) => {
    try {
      const result = await loginMutation.mutateAsync({ body: { email, password } })
      const body = result.body as { isTwoFactorAuthenticationEnabled?: boolean; token?: string }
      if (body.isTwoFactorAuthenticationEnabled) {
        setRequiresTwoFactorState(true)
        setTempCredentialsState({ email, password })
        return
      }
      if (body.token) {
        localStorage.setItem('auth-token', body.token)
      }
      await queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY })
      await queryClient.refetchQueries({ queryKey: AUTH_ME_QUERY_KEY })
      navigate('/')
    } catch (err) {
      const message = err && typeof err === 'object' && 'body' in err
        ? (err as { body?: { message?: string } }).body?.message
        : err instanceof Error
          ? err.message
          : 'Login failed'
      throw new Error(message)
    }
  }

  const authenticateTwoFactor = async (code: string) => {
    const result = await authenticateTwoFactorMutation.mutateAsync({
      body: { twoFactorAuthenticationCode: code },
    })
    setRequiresTwoFactorState(false)
    setTempCredentialsState(null)
    const body = result.body as { token?: string }
    if (body?.token) {
      localStorage.setItem('auth-token', body.token)
    }
    await queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY })
    await queryClient.refetchQueries({ queryKey: AUTH_ME_QUERY_KEY })
    navigate('/')
  }

  const register = async (name: string, email: string, password: string) => {
    await registerMutation.mutateAsync({ body: { name, email, password } })
    await queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY })
  }

  const logout = async () => {
    await logoutMutation.mutateAsync({ body: {} })
    window.location.replace('/')
  }

  const refreshUser = () => queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY })

  const value: AuthContextType = {
    user,
    loading,
    requiresTwoFactor: requiresTwoFactorState,
    tempCredentials: tempCredentialsState,
    login,
    authenticateTwoFactor,
    register,
    logout,
    refreshUser,
    setRequiresTwoFactor,
    setTempCredentials,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
