import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api from '../api/client'

type User = {
  id: string
  email: string
  display_name?: string
  role?: string
}

type AuthContextType = {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const t = localStorage.getItem('token')
    const u = localStorage.getItem('user')
    if (t && u) {
      setToken(t)
      setUser(JSON.parse(u))
    }
  }, [])

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setToken(data.token)
    setUser(data.user)
  }

  const logout = async () => {
    try { await api.post('/auth/logout') } catch {}
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  const value = useMemo(() => ({ user, token, login, logout }), [user, token])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
