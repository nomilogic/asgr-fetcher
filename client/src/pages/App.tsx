import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Routes, Route } from 'react-router-dom'
import Home from './Home'
import Players from './Players'
import HighSchools from './HighSchools'
import Circuit from './Circuit'
import Colleges from './Colleges'

export default function App() {
  return (
    <div className="min-h-full flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/players" element={<Players />} />
          <Route path="/high-schools" element={<HighSchools />} />
          <Route path="/circuit" element={<Circuit />} />
          <Route path="/colleges" element={<Colleges />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
