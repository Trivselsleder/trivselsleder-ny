import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import AdminKortoversikt from './pages/AdminKortoversikt'
import AdminOppfolging from './pages/AdminOppfolging'
import AdminEvaluering from './pages/AdminEvaluering'
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
import AdminLedelse from './pages/AdminLedelse'
import AdminHaller from './pages/AdminHaller'
import AdminTekster from './pages/AdminTekster'
import SvarSkjema from './pages/SvarSkjema'
import KursInfo from './pages/KursInfo'
import EvalueringSkjema from './pages/EvalueringSkjema'
// Fase 3 — skolens skall (steg 1) + bibliotek (steg 3)
import SkoleLayout from './components/SkoleLayout'
import SkoleAdministratorer from './pages/skole/SkoleAdministratorer'
import SkoleAnsatte from './pages/skole/SkoleAnsatte'
import SkoleKundeinformasjon from './pages/skole/SkoleKundeinformasjon'
import SkoleBestillinger from './pages/skole/SkoleBestillinger'
import SkoleDokumenter from './pages/skole/SkoleDokumenter'
import SkoleAktiviteter from './pages/skole/SkoleAktiviteter'
import SkoleLek from './pages/skole/SkoleLek'
import SkoleMoveIt from './pages/skole/SkoleMoveIt'
import SkoleAktivLaering from './pages/skole/SkoleAktivLaering'
import SkolePeriodeplaner from './pages/skole/SkolePeriodeplaner'
import SkolePeriodeplan from './pages/skole/SkolePeriodeplan'
import DeltPeriodeplan from './pages/DeltPeriodeplan'
import SkjermPlan from './pages/SkjermPlan'
import SkoleTLhjulet from './pages/skole/SkoleTLhjulet'
import SkoleHjul from './pages/skole/SkoleHjul'
import SkoleDriftAvTL from './pages/skole/SkoleDriftAvTL'
import SkoleWebinarer from './pages/skole/SkoleWebinarer'
// Trivselsundersøkelsen — lærerflaten (steg 4.1–4.2). Role-gates internt
// (HTLA/skoleadmin/superadmin) i tillegg til at fanen er skjult for andre.
import SkoleTrivselsundersokelsen from './pages/skole/SkoleTrivselsundersokelsen'
import SkoleTuOpprett from './pages/skole/SkoleTuOpprett'
import SkoleTuKoder from './pages/skole/SkoleTuKoder'
import Webinarer from './pages/Webinarer'
import AdminWebinarer from './pages/AdminWebinarer'
import AdminNyhetsbrev from './pages/AdminNyhetsbrev'
import IkkeFunnet from './pages/IkkeFunnet'
// Trivselsundersøkelsen — elevflaten (kap. 21, steg 3). Egen minimal rute uten nettstedschrome.
import Trivselsundersokelsen from './pages/Trivselsundersokelsen'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <KanskjeHeader />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/om-oss" element={<OmOss />} />
              <Route path="/for-skoler" element={<ForSkoler />} />
              <Route path="/kontakt" element={<Kontakt />} />
              <Route path="/webinarer" element={<Webinarer />} />
              <Route path="/kulturkortet" element={<Kulturkort />} />
              <Route path="/kulturkortet/bestill" element={<KulturkortBestill />} />
              {/* Gamle/forkortede adresser -> riktig rute */}
              <Route path="/kulturkort" element={<Navigate to="/kulturkortet" replace />} />
              <Route path="/kulturkort/bestill" element={<Navigate to="/kulturkortet/bestill" replace />} />
              <Route path="/logg-inn" element={<LoggInn />} />
              <Route path="/sett-passord" element={<SettPassord />} />
              <Route path="/auth/feide/callback" element={<FeideCallback />} />
              <Route path="/paamelding" element={<Paamelding />} />
              <Route path="/svar/:token" element={<SvarSkjema />} />
              <Route path="/kursinfo/:token" element={<KursInfo />} />
              <Route path="/evaluering/:token" element={<EvalueringSkjema />} />
              <Route path="/plan/:token" element={<DeltPeriodeplan />} />
              <Route path="/skjerm/:token" element={<SkjermPlan />} />
              <Route
                path="/min-side"
                element={
                  <ProtectedRoute>
                    <SkoleLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<MinSide />} />
                <Route path="administratorer" element={<SkoleAdministratorer />} />
                <Route path="ansatte" element={<SkoleAnsatte />} />
                <Route path="kundeinformasjon" element={<SkoleKundeinformasjon />} />
                <Route path="bestillinger" element={<SkoleBestillinger />} />
                <Route path="dokumenter" element={<SkoleDokumenter />} />
                <Route path="aktiviteter" element={<SkoleAktiviteter />} />
                <Route path="aktiviteter/:id" element={<SkoleLek />} />
                <Route path="move-it" element={<SkoleMoveIt />} />
                <Route path="aktiv-laering" element={<SkoleAktivLaering />} />
                <Route path="periodeplaner" element={<SkolePeriodeplaner />} />
                <Route path="periodeplaner/:id" element={<SkolePeriodeplan />} />
                <Route path="tl-hjulet" element={<SkoleTLhjulet />} />
                <Route path="tl-hjulet/:id" element={<SkoleHjul />} />
                <Route path="drift-av-tl" element={<SkoleDriftAvTL />} />
                <Route path="webinarer" element={<SkoleWebinarer />} />
                <Route path="trivselsundersokelsen" element={<SkoleTrivselsundersokelsen />} />
                <Route path="trivselsundersokelsen/opprett" element={<SkoleTuOpprett />} />
                <Route path="trivselsundersokelsen/koder" element={<SkoleTuKoder />} />
              </Route>
              <Route
                path="/admin"
                element={
                  <ProtectedRoute kreverRolle={['superadmin', 'ansatt']}>
                    <Admin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/webinarer"
                element={
                  <ProtectedRoute kreverRolle={['superadmin', 'ansatt']}>
                    <AdminWebinarer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/nyhetsbrev"
                element={
                  <ProtectedRoute kreverRolle={['superadmin', 'ansatt']}>
                    <AdminNyhetsbrev />
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
              <Route path="/admin/bestillinger" element={<Navigate to="/admin/kortoversikt" replace />} />
              <Route path="/admin/tekster" element={<ProtectedRoute kreverRolle={["superadmin", "ansatt"]}><AdminTekster /></ProtectedRoute>} />
              <Route path="/admin/ledelse" element={<ProtectedRoute kreverRolle="superadmin"><AdminLedelse /></ProtectedRoute>} />
              <Route path="/admin/haller" element={<ProtectedRoute kreverRolle={["superadmin", "ansatt"]}><AdminHaller /></ProtectedRoute>} />
              <Route path="/admin/kortutdeling" element={<Navigate to="/admin/kortoversikt" replace />} />
              <Route path="/admin/kortoversikt" element={<ProtectedRoute kreverRolle={["superadmin", "ansatt"]}><AdminKortoversikt /></ProtectedRoute>} />
              <Route path="/admin/oppfolging" element={<ProtectedRoute kreverRolle={["superadmin", "ansatt"]}><AdminOppfolging /></ProtectedRoute>} />
              <Route path="/admin/evalueringer" element={<ProtectedRoute kreverRolle={["superadmin", "ansatt"]}><AdminEvaluering /></ProtectedRoute>} />
              {/* Trivselsundersøkelsen — elevflaten (steg 3). Offentlig, ingen innlogging.
                  Koden tastes på siden og sendes med POST (aldri i URL). Minimal, uten chrome.
                  Testfase: trivselsleder-ny.vercel.app/undersokelse. Ved lansering pekes
                  domenet trivselsundersokelsen.no hit. */}
              <Route path="/undersokelse" element={<Trivselsundersokelsen />} />
              {/* Fang-alt: ukjent adresse gir 404-side, ikke tom side */}
              <Route path="*" element={<IkkeFunnet />} />
            </Routes>
          </main>
          <KanskjeFooter />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

// Oppslags-TV (/skjerm/:token) skal ikke vise nettstedsmeny/footer.
function utenChrome(pathname) { return pathname.startsWith('/skjerm/') || pathname.startsWith('/undersokelse') }
function KanskjeHeader() { return utenChrome(useLocation().pathname) ? null : <Header /> }
function KanskjeFooter() { return utenChrome(useLocation().pathname) ? null : <Footer /> }
