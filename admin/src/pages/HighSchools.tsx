import { useEffect, useState } from 'react'
import api from '../api/client'

type HS = { id: number, school: string, logo_path?: string }

export default function HighSchools() {
  const [rows, setRows] = useState<HS[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/high-schools', { params: { limit: 100 } })
        setRows(data || [])
      } catch (e: any) { setError(e?.response?.data?.error || 'Failed to load') }
      finally { setLoading(false) }
    })()
  }, [])

  return (
    <div>
      <h2>High Schools</h2>
      {loading ? 'Loading...' : error ? <div style={{ color: 'red' }}>{error}</div> : (
        <table cellPadding={6} cellSpacing={0} style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr><th align="left">ID</th><th align="left">School</th><th align="left">Logo</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.school}</td>
                <td>{r.logo_path || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
