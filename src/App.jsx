import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import OmOss from './pages/OmOss'
import ForSkoler from './pages/ForSkoler'
import Kontakt from './pages/Kontakt'
import Kulturkort from './pages/Kulturkort'
import KulturkortBestill from './pages/KulturkortBestill'
import AdminKulturkort from './pages/AdminKulturkort'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/om-oss" element={<OmOss />} />
            <Route path="/for-skoler" element={<ForSkoler />} />
            <Route path="/kontakt" element={<Kontakt />} />
            <Route path="/kulturkortet" element={<Kulturkort />} />
            <Route path="/kulturkortet/bestill" element={<KulturkortBestill />} />
            <Route path="/admin/kulturkort" element={<AdminKulturkort />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}
