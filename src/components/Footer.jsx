import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-10">
          <div>
            <Link to="/" className="text-xl font-bold text-white hover:text-orange transition-colors">
              Trivselsleder
            </Link>
            <p className="mt-3 text-sm leading-relaxed">{t('footer.tagline')}</p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-3">{t('footer.sider')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/om-oss" className="hover:text-orange transition-colors">{t('nav.omOss')}</Link></li>
              <li><Link to="/for-skoler" className="hover:text-orange transition-colors">{t('nav.forSkoler')}</Link></li>
              <li><Link to="/kontakt" className="hover:text-orange transition-colors">{t('nav.kontakt')}</Link></li>
              <li><Link to="/logg-inn" className="hover:text-orange transition-colors">{t('nav.loggInn')}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-3">{t('footer.kontakt')}</h3>
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
          <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          <div className="flex gap-4">
            <Link to="/personvern" className="hover:text-orange transition-colors">{t('footer.personvern')}</Link>
            <Link to="/vilkar" className="hover:text-orange transition-colors">{t('footer.vilkar')}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
