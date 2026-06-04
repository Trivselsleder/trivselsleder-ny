import { Link } from 'react-router-dom'

const steps = [
  {
    number: '1',
    title: 'Ta kontakt',
    desc: 'Fyll ut påmeldingsskjemaet eller kontakt oss direkte. Vi svarer innen én virkedag.',
  },
  {
    number: '2',
    title: 'Opplæring',
    desc: 'Vi gjennomfører en opplæringsdag på skolen der lærere og utvalgte elever blir kurset.',
  },
  {
    number: '3',
    title: 'Kom i gang',
    desc: 'Trivselslederne tar over friminuttene med aktiviteter fra ressursbiblioteket.',
  },
  {
    number: '4',
    title: 'Oppfølging',
    desc: 'Vi følger opp skolen gjennom skoleåret med materiell, tips og støtte.',
  },
]

const included = [
  'Opplæringsdag for lærere og elever',
  'Tilgang til ressursbibliotek med 200+ aktiviteter',
  'Trivselsleder-vester til elevene',
  'Digitale læringsopplegg og Move it-aktiviteter',
  'Løpende støtte og oppfølging',
]

export default function ForSkoler() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">For skoler</h1>
      <p className="text-lg text-gray-500 mb-12">
        Slik blir skolen din en del av Trivselsprogrammet.
      </p>

      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Slik fungerer det</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {steps.map((step) => (
            <div key={step.number} className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange text-white font-bold flex items-center justify-center text-lg">
                {step.number}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16 bg-gray-50 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Hva er inkludert?</h2>
        <ul className="space-y-3">
          {included.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <svg className="w-5 h-5 text-orange flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-gradient-to-r from-orange to-magenta rounded-2xl p-8 text-white text-center">
        <h2 className="text-2xl font-bold mb-3">Klar til å melde på skolen din?</h2>
        <p className="mb-6 text-white/90">
          Over 700 skoler er allerede med. Ta steget og gi elevene dine bedre friminutt.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/kontakt"
            className="bg-white text-orange font-semibold px-8 py-3 rounded-full hover:bg-white/90 transition-colors"
          >
            Meld på skolen
          </Link>
          <Link
            to="/kontakt"
            className="border-2 border-white text-white font-semibold px-8 py-3 rounded-full hover:bg-white/10 transition-colors"
          >
            Kontakt oss
          </Link>
        </div>
      </section>
    </div>
  )
}
