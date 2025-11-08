import { FormEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { login } = useAuth()
  const nav = useNavigate()
  const loc = useLocation() as any

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await login(email, password)
      nav(loc?.state?.from?.pathname || '/players', { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Login failed')
    }
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <form onSubmit={onSubmit} style={{ border: '1px solid #ddd', padding: 24, borderRadius: 8, minWidth: 320 }}>
        <h2>Login</h2>
        {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" required style={{ width: '100%', padding: 8 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Password</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" required style={{ width: '100%', padding: 8 }} />
        </div>
        <button type="submit" style={{ width: '100%', padding: 10 }}>Sign in</button>
      </form>
    </div>
  )
}
