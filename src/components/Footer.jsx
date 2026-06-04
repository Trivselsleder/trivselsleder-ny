import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-10">
          <div>
            <Link to="/" className="text-xl font-bold text-white hover:text-orange transition-colors">
              Trivselsleder
            </Link>
            <p className="mt-3 text-sm leading-relaxed">
              Et program som gir barn kunnskap og ferdigheter til å lede gode friminutt.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-3">Sider</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/om-oss" className="hover:text-orange transition-colors">Om oss</Link></li>
              <li><Link to="/for-skoler" className="hover:text-orange transition-colors">For skoler</Link></li>
              <li><Link to="/kontakt" className="hover:text-orange transition-colors">Kontakt</Link></li>
              <li><Link to="/logg-inn" className="hover:text-orange transition-colors">Logg inn</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-3">Kontakt</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="mailto:post@trivselsleder.no" className="hover:text-orange transition-colors">
                  post@trivselsleder.no
                </a>
              </li>
              <li>Trivselsleder AS</li>
              <li>Norge</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Trivselsleder AS. Alle rettigheter forbeholdt.</p>
          <div className="flex gap-4">
            <Link to="/personvern" className="hover:text-orange transition-colors">Personvern</Link>
            <Link to="/vilkar" className="hover:text-orange transition-colors">Vilkar</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
