import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Header from './components/Header'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import OmOss from './pages/OmOss'
import ForSkoler from './pages/ForSkoler'
import Kontakt from './pages/Kontakt'
import Kulturkort from './pages/Kulturkort'
import KulturkortBestill from './pages/KulturkortBestill'
import AdminKulturkort from './pages/AdminKulturkort'
import AdminBestillinger from './pages/AdminBestillinger'
import LoggInn from './pages/LoggInn'
import SettPassord from './pages/SettPassord'
import MinSide from './pages/MinSide'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
              <Route path="/logg-inn" element={<LoggInn />} />
              <Route path="/sett-passord" element={<SettPassord />} />
              <Route
                path="/min-side"
                element={
                  <ProtectedRoute>
                    <MinSide />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/kulturkort"
                element={
                  <ProtectedRoute kreverRolle="superadmin">
                    <AdminKulturkort />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/bestillinger"
                element={
                  <ProtectedRoute kreverRolle="superadmin">
                    <AdminBestillinger />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}
