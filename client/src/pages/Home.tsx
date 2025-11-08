import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
                Elite Girls Basketball Rankings
              </h1>
              <p className="mt-4 text-lg text-slate-600">
                Comprehensive player, high school, circuit, and college rankings and profiles.
              </p>
              <div className="mt-6 flex gap-3">
                <Link to="/players" className="inline-flex items-center rounded bg-primary-600 px-4 py-2 text-white hover:bg-primary-700">Browse Players</Link>
                <Link to="/high-schools" className="inline-flex items-center rounded border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100">High Schools</Link>
              </div>
            </div>
            <div className="md:justify-self-end">
              <div className="rounded-2xl bg-gradient-to-br from-primary-100 to-white p-6 shadow">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-4 bg-white rounded shadow-sm">
                    <div className="text-3xl font-bold text-primary-700">350</div>
                    <div className="text-xs text-slate-500">Top Players</div>
                  </div>
                  <div className="p-4 bg-white rounded shadow-sm">
                    <div className="text-3xl font-bold text-primary-700">50</div>
                    <div className="text-xs text-slate-500">High Schools</div>
                  </div>
                  <div className="p-4 bg-white rounded shadow-sm">
                    <div className="text-3xl font-bold text-primary-700">32</div>
                    <div className="text-xs text-slate-500">Circuit Teams</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold">Get started</h2>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/players" className="block rounded-lg border border-slate-200 p-4 hover:shadow-sm">
            <div className="font-semibold">Players</div>
            <div className="text-sm text-slate-600">Explore the latest classes and rankings.</div>
          </Link>
          <Link to="/high-schools" className="block rounded-lg border border-slate-2 00 p-4 hover:shadow-sm">
            <div className="font-semibold">High Schools</div>
            <div className="text-sm text-slate-600">See top programs and records.</div>
          </Link>
          <Link to="/circuit" className="block rounded-lg border border-slate-200 p-4 hover:shadow-sm">
            <div className="font-semibold">Circuit</div>
            <div className="text-sm text-slate-600">Circuit rankings and placements.</div>
          </Link>
          <Link to="/colleges" className="block rounded-lg border border-slate-200 p-4 hover:shadow-sm">
            <div className="font-semibold">Colleges</div>
            <div className="text-sm text-slate-600">College programs and logos.</div>
          </Link>
        </div>
      </section>
    </div>
  )
}
