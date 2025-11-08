import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const { token } = useAuth()
  const loc = useLocation()
  if (!token) return <Navigate to="/login" state={{ from: loc }} replace />
  return children
}
