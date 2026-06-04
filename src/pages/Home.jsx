import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <section className="bg-gradient-to-br from-orange/10 via-white to-magenta/10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <span className="inline-block bg-orange/10 text-orange font-semibold text-sm px-4 py-1.5 rounded-full mb-6">
          For barneskolen
        </span>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
          Gode friminutt for{' '}
          <span className="text-orange">alle barn</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          Trivselsleder gir elever verktøy og kunnskap til å skape inkluderende og aktive friminutt — for alle, hver dag.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/for-skoler"
            className="bg-orange text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-orange/90 transition-colors shadow-lg shadow-orange/20"
          >
            For skoler
          </Link>
          <Link
            to="/om-oss"
            className="bg-white text-gray-800 border-2 border-gray-200 px-8 py-4 rounded-full text-lg font-semibold hover:border-orange hover:text-orange transition-colors"
          >
            Les mer
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
        {[
          { number: '700+', label: 'Skoler i Norge' },
          { number: '50 000+', label: 'Trivselsledere' },
          { number: '20 år', label: 'Med erfaring' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-3xl font-bold text-magenta mb-1">{stat.number}</div>
            <div className="text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
