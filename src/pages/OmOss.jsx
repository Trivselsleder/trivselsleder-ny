export default function OmOss() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Om oss</h1>
      <p className="text-lg text-gray-500 mb-12">Vi jobber for at alle barn skal ha gode friminutt — hver dag.</p>

      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Trivselsleder AS</h2>
        <div className="prose prose-lg text-gray-600 space-y-4">
          <p>
            Trivselsleder AS er et norsk selskap med over 20 års erfaring innen utvikling av
            trivselsprogrammer for barneskolen. Vi er en kompetansebedrift som jobber tett
            med skoler, kommuner og utdanningsmyndigheter for å fremme et godt læringsmiljø.
          </p>
          <p>
            Selskapet ble etablert med en klar visjon: at alle barn — uavhengig av bakgrunn,
            interesser og forutsetninger — skal ha tilgang til inkluderende og aktive friminutt.
            I dag samarbeider vi med over 700 skoler over hele landet.
          </p>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Trivselsprogrammet</h2>
        <div className="text-gray-600 space-y-4 text-lg">
          <p>
            Trivselsprogrammet er kjernen i vår virksomhet. Programmet utdanner elever på
            mellomtrinnet til å bli <strong className="text-gray-800">trivselsledere</strong> — elever
            som tar ansvar for å lede aktiviteter i friminuttene for yngre medelever.
          </p>
          <p>
            Gjennom opplæring, verktøy og et stort aktivitetsbibliotek får trivselslederne
            alt de trenger for å skape inkluderende lek og aktivitet. Resultatet er færre
            konflikter, mer bevegelse og bedre trivsel for alle elever.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              title: 'Inkludering',
              desc: 'Alle skal ha noen å leke med. Trivselslederne sørger for at ingen står alene.',
            },
            {
              title: 'Aktivitet',
              desc: 'Et stort bibliotek med leker og aktiviteter gir variasjon og glede i friminuttene.',
            },
            {
              title: 'Ansvar',
              desc: 'Elevene lærer å ta ansvar for fellesskapet — en viktig livsmestring.',
            },
          ].map((card) => (
            <div key={card.title} className="bg-orange/5 border border-orange/20 rounded-2xl p-6">
              <h3 className="font-bold text-gray-900 mb-2">{card.title}</h3>
              <p className="text-gray-600 text-sm">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Vår misjon</h2>
        <blockquote className="border-l-4 border-orange pl-6 text-xl text-gray-700 italic">
          "Vi tror at gode friminutt skaper bedre dager — og bedre dager skaper bedre liv."
        </blockquote>
      </section>
    </div>
  )
}
