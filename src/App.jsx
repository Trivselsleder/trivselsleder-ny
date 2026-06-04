import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import OmOss from './pages/OmOss'
import ForSkoler from './pages/ForSkoler'
import Kontakt from './pages/Kontakt'
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
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}
