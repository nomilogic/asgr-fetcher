import { useEffect, useState } from 'react'
import { api, imageUrlFromPath } from '../lib/api'

export default function HighSchools() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data } = await api.get('/high-schools', { params: { limit: 100 } })
      setRows(data || [])
      setLoading(false)
    })()
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold">High Schools</h1>
      {loading ? (
        <div className="mt-6">Loading...</div>
      ) : (
        <ul className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map(s => (
            <li key={s.id} className="border rounded-lg bg-white p-4">
              <div className="flex gap-4 items-center">
                {s.logo_path ? (
                  <img src={imageUrlFromPath(s.logo_path)} alt={s.school} className="h-12 w-12 object-contain bg-white rounded border" />
                ) : (
                  <div className="h-12 w-12 rounded bg-slate-200" />
                )}
                <div>
                  <div className="font-semibold">{s.school}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
