import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import RequireAuth from './auth/RequireAuth'
import Nav from './components/Nav'
import Login from './pages/Login'
import Players from './pages/Players'
import HighSchools from './pages/HighSchools'
import CircuitTeams from './pages/CircuitTeams'
import Colleges from './pages/Colleges'

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Nav />
      <main style={{ flex: 1, padding: 20 }}>{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={<Navigate to="/players" replace />}
        />
        <Route
          path="/players"
          element=
            {
              <RequireAuth>
                <Layout>
                  <Players />
                </Layout>
              </RequireAuth>
            }
        />
        <Route
          path="/high-schools"
          element=
            {
              <RequireAuth>
                <Layout>
                  <HighSchools />
                </Layout>
              </RequireAuth>
            }
        />
        <Route
          path="/circuit-teams"
          element=
            {
              <RequireAuth>
                <Layout>
                  <CircuitTeams />
                </Layout>
              </RequireAuth>
            }
        />
        <Route
          path="/colleges"
          element=
            {
              <RequireAuth>
                <Layout>
                  <Colleges />
                </Layout>
              </RequireAuth>
            }
        />
        <Route path="*" element={<Navigate to="/players" replace />} />
      </Routes>
    </AuthProvider>
  )
}
