import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const linkStyle: React.CSSProperties = { display: 'block', padding: '8px 12px', textDecoration: 'none', color: '#222' }
const active: React.CSSProperties = { background: '#eee' }

export default function Nav() {
  const { logout, user } = useAuth()
  return (
    <aside style={{ width: 220, borderRight: '1px solid #ddd', padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>ASGR Admin</h3>
      <div style={{ marginBottom: 12, fontSize: 12, color: '#666' }}>
        {user?.email}
      </div>
      <nav>
        <NavLink to="/players" style={({ isActive }) => ({ ...linkStyle, ...(isActive ? active : {}) })}>Players</NavLink>
        <NavLink to="/high-schools" style={({ isActive }) => ({ ...linkStyle, ...(isActive ? active : {}) })}>High Schools</NavLink>
        <NavLink to="/circuit-teams" style={({ isActive }) => ({ ...linkStyle, ...(isActive ? active : {}) })}>Circuit Teams</NavLink>
        <NavLink to="/colleges" style={({ isActive }) => ({ ...linkStyle, ...(isActive ? active : {}) })}>Colleges</NavLink>
      </nav>
      <button onClick={logout} style={{ marginTop: 16 }}>Logout</button>
    </aside>
  )
}
