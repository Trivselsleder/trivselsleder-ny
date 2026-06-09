export function RedigerInput({ label, type = 'text', value, onChange, placeholder = '' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]/30 focus:border-[#F47920]"
      />
    </div>
  )
}

export function SkoleRedigerForm({ form, felt, settTla, fjernTla, leggTilTla, onSubmit, onAvbryt, lagrer, lagreFeil }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <RedigerInput label="Skolenavn" value={form.navn} onChange={v => felt('navn', v)} />
      <div className="grid grid-cols-2 gap-3">
        <RedigerInput label="Gateadresse" value={form.gateadresse} onChange={v => felt('gateadresse', v)} />
        <RedigerInput label="Telefon" type="tel" value={form.telefon} onChange={v => felt('telefon', v)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <RedigerInput label="Postnummer" value={form.postnummer} onChange={v => felt('postnummer', v)} />
        <RedigerInput label="Poststed"   value={form.poststed}   onChange={v => felt('poststed', v)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <RedigerInput label="Antall elever" type="number" value={form.antall_elever} onChange={v => felt('antall_elever', v)} />
        <RedigerInput label="Type skole" value={form.type} onChange={v => felt('type', v)} placeholder="f.eks. Barneskole" />
      </div>
      <RedigerInput label="Nettverk" value={form.nettverk} onChange={v => felt('nettverk', v)} placeholder="f.eks. Oslo øst" />

      <p className="text-xs font-semibold text-[#F47920] uppercase tracking-wide pt-2">Rektor</p>
      <div className="grid grid-cols-3 gap-3">
        <RedigerInput label="Navn"    value={form.rektor_navn}    onChange={v => felt('rektor_navn', v)} />
        <RedigerInput label="E-post"  type="email" value={form.rektor_epost}   onChange={v => felt('rektor_epost', v)} />
        <RedigerInput label="Telefon" type="tel"   value={form.rektor_telefon} onChange={v => felt('rektor_telefon', v)} />
      </div>

      <p className="text-xs font-semibold text-[#F47920] uppercase tracking-wide pt-2">Hovedkontakt TL</p>
      <div className="grid grid-cols-3 gap-3">
        <RedigerInput label="Navn"    value={form.hktl_navn}    onChange={v => felt('hktl_navn', v)} />
        <RedigerInput label="E-post"  type="email" value={form.hktl_epost}   onChange={v => felt('hktl_epost', v)} />
        <RedigerInput label="Telefon" type="tel"   value={form.hktl_telefon} onChange={v => felt('hktl_telefon', v)} />
      </div>

      <p className="text-xs font-semibold text-[#F47920] uppercase tracking-wide pt-2">TL-ansvarlig</p>
      {form.tla_kontakter.map((tla, i) => (
        <div key={i} className="grid grid-cols-3 gap-3 items-end">
          <RedigerInput label="Navn"   value={tla.navn}   onChange={v => settTla(i, 'navn', v)} />
          <RedigerInput label="E-post" type="email" value={tla.epost}   onChange={v => settTla(i, 'epost', v)} />
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <RedigerInput label="Telefon" type="tel" value={tla.telefon} onChange={v => settTla(i, 'telefon', v)} />
            </div>
            {form.tla_kontakter.length > 1 && (
              <button
                type="button"
                onClick={() => fjernTla(i)}
                className="mb-0.5 text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                title="Fjern"
              >×</button>
            )}
          </div>
        </div>
      ))}
      {form.tla_kontakter.length < 5 && (
        <button
          type="button"
          onClick={leggTilTla}
          className="text-xs text-[#F47920] hover:text-[#e06910] font-medium"
        >+ Legg til TL-ansvarlig</button>
      )}

      {lagreFeil && <p className="text-sm text-red-500">{lagreFeil}</p>}
      <div className="flex items-center justify-end gap-3 pt-1">
        <button type="button" onClick={onAvbryt} className="text-sm text-gray-500 hover:text-gray-800">
          Avbryt
        </button>
        <button
          type="submit"
          disabled={lagrer}
          className="bg-[#F47920] text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-[#e06910] transition-colors disabled:opacity-50"
        >
          {lagrer ? 'Lagrer…' : 'Lagre'}
        </button>
      </div>
    </form>
  )
}
