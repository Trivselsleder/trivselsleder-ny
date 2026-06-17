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
import FeideCallback from './pages/FeideCallback'
import Paamelding from './pages/Paamelding'
import AdminPaameldinger from './pages/AdminPaameldinger'
import AdminSkoler from './pages/AdminSkoler'
import AdminBrukere from './pages/AdminBrukere'
import Admin from './pages/Admin'
import AdminKursplanlegger from './pages/AdminKursplanlegger'
import AdminHaller from './pages/AdminHaller'
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
              <Route path="/auth/feide/callback" element={<FeideCallback />} />
              <Route path="/paamelding" element={<Paamelding />} />
              <Route
                path="/min-side"
                element={
                  <ProtectedRoute>
                    <MinSide />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute kreverRolle={['superadmin', 'ansatt']}>
                    <Admin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/kursplanlegger"
                element={
                  <ProtectedRoute kreverRolle={['superadmin', 'ansatt']}>
                    <AdminKursplanlegger />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/paameldinger"
                element={
                  <ProtectedRoute kreverRolle={['superadmin', 'ansatt']}>
                    <AdminPaameldinger />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/skoler"
                element={
                  <ProtectedRoute kreverRolle={['superadmin', 'ansatt']}>
                    <AdminSkoler />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/brukere"
                element={
                  <ProtectedRoute kreverRolle="superadmin">
                    <AdminBrukere />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/kulturkort"
                element={
                  <ProtectedRoute kreverRolle={['superadmin', 'ansatt']}>
                    <AdminKulturkort />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/bestillinger"
                element={
                  <ProtectedRoute kreverRolle={['superadmin', 'ansatt']}>
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
