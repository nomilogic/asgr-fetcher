import { useEffect, useState } from 'react'
import api from '../api/client'

type Player = {
  id: number
  name: string
  rank?: number
}

export default function Players() {
  const [rows, setRows] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [newRank, setNewRank] = useState<number | ''>('')

  const load = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/players', { params: { limit: 50 } })
      setRows(data?.data || [])
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const upsert = async () => {
    if (!newName) return
    await api.post('/players', { name: newName, rank: newRank === '' ? null : Number(newRank) })
    setNewName(''); setNewRank('');
    await load()
  }

  return (
    <div>
      <h2>Players</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} />
        <input placeholder="Rank" value={newRank} onChange={e => setNewRank(e.target.value === '' ? '' : Number(e.target.value))} />
        <button onClick={upsert}>Add/Update</button>
      </div>
      {loading ? 'Loading...' : error ? <div style={{ color: 'red' }}>{error}</div> : (
        <table cellPadding={6} cellSpacing={0} style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr><th align="left">ID</th><th align="left">Name</th><th align="left">Rank</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.name}</td>
                <td>{r.rank ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
