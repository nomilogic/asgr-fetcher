import { useEffect, useState } from 'react'
import { api, imageUrlFromPath } from '../lib/api'

export default function Players() {
  const [season, setSeason] = useState<string>('2025')
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data } = await api.get('/players', { params: { limit: 50, season } })
      setRows(data?.data || [])
      setLoading(false)
    })()
  }, [season])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Players</h1>
        <select value={season} onChange={e => setSeason(e.target.value)} className="border rounded px-2 py-1">
          {['2024','2025','2026','2027','2028'].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {loading ? (
        <div className="mt-6">Loading...</div>
      ) : (
        <ul className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map(p => (
            <li key={p.id} className="border rounded-lg bg-white p-4">
              <div className="flex gap-4 items-center">
                {p.image_path ? (
                  <img src={imageUrlFromPath(p.image_path)} alt={p.name} className="h-16 w-16 object-cover rounded-full border" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-slate-200" />
                )}
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-sm text-slate-600">Rank: {p.ranks?.[season] ?? p.rank ?? '—'}</div>
                  {p.ratings?.[season] && (
                    <div className="text-sm text-slate-600">Rating: {p.ratings[season]}</div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
