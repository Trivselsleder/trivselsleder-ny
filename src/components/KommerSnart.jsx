export default function KommerSnart({ tittel, beskrivelse }) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center py-20 px-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-orange/10 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-orange-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{tittel}</h1>
        <p className="text-gray-500 max-w-md mx-auto">
          {beskrivelse ?? 'Denne delen bygges nå og kommer snart.'}
        </p>
        <span className="inline-block mt-5 text-xs font-semibold text-petrol bg-petrol/10 px-3 py-1 rounded-full">
          Kommer snart
        </span>
      </div>
    </div>
  )
}
