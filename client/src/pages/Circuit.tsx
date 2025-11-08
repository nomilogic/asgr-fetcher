import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function Circuit() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data } = await api.get('/circuit-teams', { params: { limit: 100 } })
      setRows(data || [])
      setLoading(false)
    })()
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold">Circuit Teams</h1>
      {loading ? (
        <div className="mt-6">Loading...</div>
      ) : (
        <ul className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map(t => (
            <li key={t.id} className="border rounded-lg bg-white p-4">
              <div className="font-semibold">{t.team}</div>
              <div className="text-sm text-slate-600">{t.circuit || ''}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
