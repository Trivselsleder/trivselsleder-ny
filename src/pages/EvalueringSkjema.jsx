import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// Evalueringsskjema for skoler (etter kurs).
// Skolen åpner sin private lenke: /evaluering/:token

const SKALA = [1, 2, 3, 4, 5, 6];

const RESERVE = {
  gjennomforing: { sporsmal: 'Hvordan opplevde dere gjennomføringen av lekekurset?', skala_lav: 'svært dårlig', skala_hoy: 'svært bra' },
  info:          { sporsmal: 'Hvordan opplevde dere informasjonen i forkant?',        skala_lav: 'svært dårlig', skala_hoy: 'svært bra' },
  aktiviteter:   { sporsmal: 'Hvordan opplevde dere utvalget av aktiviteter?',        skala_lav: 'svært dårlig', skala_hoy: 'svært bra' },
};

function kr(n) {
  return n.toLocaleString('no-NO') + ' kr';
}

function Skala({ verdi, settVerdi }) {
  return (
    <div className="flex gap-2">
      {SKALA.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => settVerdi(n)}
          aria-pressed={verdi === n}
          className={
            verdi === n
              ? 'flex-1 py-3 rounded-xl border-2 border-orange-500 bg-orange-50 text-orange-700 font-semibold text-lg'
              : 'flex-1 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-medium hover:border-gray-300 text-lg'
          }
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function SkalaSporsmal({ tekst, verdi, settVerdi }) {
  return (
    <fieldset className="mb-8">
      <legend className="text-lg font-semibold text-gray-900 mb-3">
        {tekst.sporsmal}
        <span className="block text-sm font-normal text-gray-500 mt-1">1 = {tekst.skala_lav}, 6 = {tekst.skala_hoy}</span>
      </legend>
      <Skala verdi={verdi} settVerdi={settVerdi} />
    </fieldset>
  );
}

export default function EvalueringSkjema() {
  const { token } = useParams();

  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState('');
  const [info, setInfo] = useState(null);
  const [sender, setSender] = useState(false);
  const [ferdig, setFerdig] = useState(false);

  const [tekster, setTekster] = useState(RESERVE);
  const [pakker, setPakker] = useState([]);

  const [gjennomforing, setGjennomforing] = useState(null);
  const [infoForkant, setInfoForkant] = useState(null);
  const [aktiviteter, setAktiviteter] = useState(null);
  const [gullkorn, setGullkorn] = useState('');

  // Valg: enten en pakke-id, eller 'samtale', eller 'nei'
  const [valg, setValg] = useState(null);

  useEffect(() => {
    let aktiv = true;
    async function hent() {
      setLaster(true);
      setFeil('');

      const { data: sporsmal } = await supabase.rpc('hent_aktive_sporsmal');
      if (aktiv && sporsmal && sporsmal.length > 0) {
        const nye = { ...RESERVE };
        sporsmal.forEach((s) => {
          nye[s.felt] = { sporsmal: s.sporsmal, skala_lav: s.skala_lav, skala_hoy: s.skala_hoy };
        });
        setTekster(nye);
      }

      const { data: pakkeData } = await supabase.rpc('hent_aktive_pakker');
      if (aktiv && pakkeData) setPakker(pakkeData);

      const { data, error } = await supabase.rpc('hent_evaluering_via_token', {
        token: token,
      });
      if (!aktiv) return;
      if (error) {
        setFeil('Noe gikk galt da vi hentet skjemaet. Prøv igjen, eller ta kontakt med oss.');
        setLaster(false);
        return;
      }
      if (!data || data.length === 0) {
        setFeil('Vi fant ikke evalueringen din. Sjekk at du har brukt hele lenken fra e-posten.');
        setLaster(false);
        return;
      }
      const rad = data[0];
      setInfo(rad);
      if (rad.svart) {
        setGjennomforing(rad.vurd_gjennomforing);
        setInfoForkant(rad.vurd_info);
        setAktiviteter(rad.vurd_aktiviteter);
        setGullkorn(rad.gullkorn ?? '');
        if (rad.valgt_pakke_id) setValg(rad.valgt_pakke_id);
        else if (rad.kjopsinteresse) setValg(rad.kjopsinteresse);
      }
      setLaster(false);
    }
    hent();
    return () => { aktiv = false; };
  }, [token]);

  async function sendInn() {
    setFeil('');
    if (gjennomforing === null || infoForkant === null || aktiviteter === null) {
      setFeil('Vennligst svar på de tre vurderingsspørsmålene.');
      return;
    }
    if (valg === null) {
      setFeil('Vennligst svar på spørsmålet om kurspakke.');
      return;
    }

    // Oversett valg til kjopsinteresse + pakke-id
    const erPakke = valg !== 'samtale' && valg !== 'nei';
    const kjopsinteresse = erPakke ? 'pakke' : valg;
    const pakkeId = erPakke ? valg : null;

    setSender(true);
    const { error } = await supabase.rpc('lagre_evaluering', {
      token: token,
      p_vurd_gjennomforing: gjennomforing,
      p_vurd_info: infoForkant,
      p_vurd_aktiviteter: aktiviteter,
      p_gullkorn: gullkorn.trim() === '' ? null : gullkorn.trim(),
      p_kjopsinteresse: kjopsinteresse,
      p_valgt_pakke_id: pakkeId,
    });
    setSender(false);
    if (error) {
      setFeil('Noe gikk galt da vi lagret svaret. Prøv igjen.');
      return;
    }
    setFerdig(true);
  }

  if (laster) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-lg text-gray-600">Laster skjemaet …</p>
      </main>
    );
  }

  if (feil && !info) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <p className="text-lg text-gray-800">{feil}</p>
        </div>
      </main>
    );
  }

  if (ferdig) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4" aria-hidden="true">✓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Takk for tilbakemeldingen!</h1>
          <p className="text-gray-700">
            Evalueringen deres er registrert. Dere kan trygt lukke denne siden.
          </p>
        </div>
      </main>
    );
  }

  const knappValgt = 'w-full rounded-xl border-2 border-orange-500 bg-orange-50 p-4 text-left';
  const knappUvalgt = 'w-full rounded-xl border-2 border-gray-200 bg-white p-4 text-left hover:border-gray-300';
  const enkelValgt = 'w-full py-3 px-4 rounded-xl border-2 border-orange-500 bg-orange-50 text-orange-700 font-semibold text-left';
  const enkelUvalgt = 'w-full py-3 px-4 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-medium hover:border-gray-300 text-left';

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Evaluering av lekekurset</h1>
        {info && (
          <p className="text-gray-600 mb-8">
            {info.kurs_navn}
            {info.kurs_dato ? ` · ${new Date(info.kurs_dato).toLocaleDateString('no-NO')}` : ''}
          </p>
        )}

        <SkalaSporsmal tekst={tekster.gjennomforing} verdi={gjennomforing} settVerdi={setGjennomforing} />
        <SkalaSporsmal tekst={tekster.info} verdi={infoForkant} settVerdi={setInfoForkant} />
        <SkalaSporsmal tekst={tekster.aktiviteter} verdi={aktiviteter} settVerdi={setAktiviteter} />

        <div className="mb-8">
          <label htmlFor="gullkorn" className="block text-lg font-semibold text-gray-900 mb-2">
            Gullkorn{' '}
            <span className="font-normal text-gray-500">(valgfritt)</span>
          </label>
          <p className="text-sm text-gray-500 mb-2">
            Var det noe en trivselsleder sa eller gjorde som satte seg? Eller andre innspill?
          </p>
          <textarea
            id="gullkorn"
            rows="3"
            value={gullkorn}
            onChange={(e) => setGullkorn(e.target.value)}
            className="w-full py-3 px-4 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none"
          />
        </div>

        <fieldset className="mb-8">
          <legend className="text-lg font-semibold text-gray-900 mb-3">
            Ønsker dere å kjøpe en av høstens lekekurspakker?
          </legend>
          <div className="flex flex-col gap-3">
            {pakker.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setValg(p.id)}
                aria-pressed={valg === p.id}
                className={valg === p.id ? knappValgt : knappUvalgt}
              >
                <div className="flex items-start gap-4">
                  {p.bilde_url && (
                    <img src={p.bilde_url} alt={p.navn} className="w-24 h-24 object-cover rounded-lg flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-gray-900">Ja, {p.navn.charAt(0).toLowerCase() + p.navn.slice(1)}</span>
                      <span className="font-bold text-orange-700 whitespace-nowrap">{kr(p.pris)}</span>
                    </div>
                    {p.beskrivelse && <p className="text-sm text-gray-600 mt-1">{p.beskrivelse}</p>}
                    <p className="text-xs text-gray-400 mt-1">Pris eks. mva. og frakt.</p>
                  </div>
                </div>
              </button>
            ))}

            <button
              type="button"
              onClick={() => setValg('samtale')}
              aria-pressed={valg === 'samtale'}
              className={valg === 'samtale' ? enkelValgt : enkelUvalgt}
            >
              Ja, vi ønsker en samtale
            </button>

            <button
              type="button"
              onClick={() => setValg('nei')}
              aria-pressed={valg === 'nei'}
              className={valg === 'nei' ? enkelValgt : enkelUvalgt}
            >
              Nei, ikke nå
            </button>
          </div>
        </fieldset>

        {feil && (
          <p className="mb-4 text-pink-700 bg-pink-50 border border-pink-200 rounded-xl py-3 px-4" role="alert">
            {feil}
          </p>
        )}

        <button
          type="button"
          onClick={sendInn}
          disabled={sender}
          className="w-full py-4 px-6 rounded-xl bg-orange-500 text-white text-lg font-semibold hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {sender ? 'Sender …' : 'Send evaluering'}
        </button>
      </div>
    </main>
  );
}
