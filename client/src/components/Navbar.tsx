import { Link, NavLink } from 'react-router-dom'

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-bold text-primary-700 text-lg">ASGR Rankings</Link>
        <nav className="flex gap-4 text-sm">
          <NavLink to="/players" className={({isActive}) => `px-2 py-1 rounded ${isActive ? 'text-primary-700 font-semibold' : 'text-slate-700 hover:text-primary-700'}`}>Players</NavLink>
          <NavLink to="/high-schools" className={({isActive}) => `px-2 py-1 rounded ${isActive ? 'text-primary-700 font-semibold' : 'text-slate-700 hover:text-primary-700'}`}>High Schools</NavLink>
          <NavLink to="/circuit" className={({isActive}) => `px-2 py-1 rounded ${isActive ? 'text-primary-700 font-semibold' : 'text-slate-700 hover:text-primary-700'}`}>Circuit</NavLink>
          <NavLink to="/colleges" className={({isActive}) => `px-2 py-1 rounded ${isActive ? 'text-primary-700 font-semibold' : 'text-slate-700 hover:text-primary-700'}`}>Colleges</NavLink>
        </nav>
      </div>
    </header>
  )
}
