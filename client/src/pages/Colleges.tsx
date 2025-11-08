import { useEffect, useState } from 'react'
import { api, imageUrlFromPath } from '../lib/api'

export default function Colleges() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data } = await api.get('/colleges', { params: { limit: 100 } })
      setRows(data || [])
      setLoading(false)
    })()
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold">Colleges</h1>
      {loading ? (
        <div className="mt-6">Loading...</div>
      ) : (
        <ul className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map(c => (
            <li key={c.id} className="border rounded-lg bg-white p-4">
              <div className="flex gap-4 items-center">
                {c.logo_path ? (
                  <img src={imageUrlFromPath(c.logo_path)} alt={c.name} className="h-10 w-10 object-contain bg-white rounded border" />
                ) : (
                  <div className="h-10 w-10 rounded bg-slate-200" />
                )}
                <div className="font-semibold">{c.name}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
