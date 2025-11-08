import { useEffect, useState } from 'react'
import api from '../api/client'

type CT = { id: number, team: string, circuit?: string }

export default function CircuitTeams() {
  const [rows, setRows] = useState<CT[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/circuit-teams', { params: { limit: 100 } })
        setRows(data || [])
      } catch (e: any) { setError(e?.response?.data?.error || 'Failed to load') }
      finally { setLoading(false) }
    })()
  }, [])

  return (
    <div>
      <h2>Circuit Teams</h2>
      {loading ? 'Loading...' : error ? <div style={{ color: 'red' }}>{error}</div> : (
        <table cellPadding={6} cellSpacing={0} style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr><th align="left">ID</th><th align="left">Team</th><th align="left">Circuit</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.team}</td>
                <td>{r.circuit || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
