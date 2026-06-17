import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// Svar-skjema for skoler (erstatter QuestBack).
// Skolen åpner sin private lenke: /svar/:token

export default function SvarSkjema() {
  const { token } = useParams();

  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState('');
  const [kobling, setKobling] = useState(null);
  const [sender, setSender] = useState(false);
  const [ferdig, setFerdig] = useState(false);

  const [kommer, setKommer] = useState(null);
  const [antallTl, setAntallTl] = useState('');
  const [erVertskap, setErVertskap] = useState(null);
  const [arsakIkkeKomme, setArsakIkkeKomme] = useState('');
  const [arsakIkkeVertskap, setArsakIkkeVertskap] = useState('');
  const [kommentar, setKommentar] = useState('');
  const [apenForAnnet, setApenForAnnet] = useState(false);

  useEffect(() => {
    let aktiv = true;
    async function hent() {
      setLaster(true);
      setFeil('');
      const { data, error } = await supabase.rpc('hent_kurs_skole_via_token', {
        token: token,
      });
      if (!aktiv) return;
      if (error) {
        setFeil('Noe gikk galt da vi hentet skjemaet. Prøv igjen, eller ta kontakt med oss.');
        setLaster(false);
        return;
      }
      if (!data || data.length === 0) {
        setFeil('Vi fant ikke skjemaet ditt. Sjekk at du har brukt hele lenken fra e-posten.');
        setLaster(false);
        return;
      }
      const rad = data[0];
      setKobling(rad);
      if (rad.svart) {
        setKommer(rad.kommer);
        setAntallTl(rad.antall_tl ?? '');
        setErVertskap(rad.vertskap_bekreftet);
        setArsakIkkeKomme(rad.arsak_ikke_komme ?? '');
        setArsakIkkeVertskap(rad.arsak_ikke_vertskap ?? '');
        setKommentar(rad.kommentar ?? '');
      }
      setLaster(false);
    }
    hent();
    return () => { aktiv = false; };
  }, [token]);

  async function sendInn() {
    setFeil('');
    if (kommer === null) {
      setFeil('Velg om dere kommer eller ikke.');
      return;
    }
    if (kommer === true && (antallTl === '' || Number(antallTl) < 0)) {
      setFeil('Fyll inn hvor mange trivselsledere som kommer.');
      return;
    }
    if (kommer === false && arsakIkkeKomme.trim() === '') {
      setFeil('Skriv kort hvorfor dere ikke kommer.');
      return;
    }
    const visVertskap = kobling.er_vertskap === true && kommer === true;
    if (visVertskap && erVertskap === null) {
      setFeil('Velg om dere kan være vertskap.');
      return;
    }

    setSender(true);
    const { error } = await supabase.rpc('lagre_skole_svar', {
      token: token,
      p_kommer: kommer,
      p_antall_tl: kommer ? Number(antallTl) : null,
      p_er_vertskap: visVertskap ? erVertskap : null,
      p_arsak_ikke_komme: kommer ? null : arsakIkkeKomme.trim(),
      p_arsak_ikke_vertskap:
        visVertskap && erVertskap === false && arsakIkkeVertskap.trim() !== ''
          ? arsakIkkeVertskap.trim()
          : null,
      p_kommentar: kommentar.trim() === '' ? null : kommentar.trim(),
      p_apen_for_annet_kurs: kommer === false ? apenForAnnet : false,
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

  if (feil && !kobling) {
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Takk for svaret!</h1>
          <p className="text-gray-700">
            Svaret deres er registrert. Dere kan trygt lukke denne siden.
          </p>
        </div>
      </main>
    );
  }

  const visVertskap = kobling.er_vertskap === true && kommer === true;

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Svar på kursinvitasjon</h1>
        <p className="text-gray-600 mb-8">
          Fyll ut skjemaet under, så registrerer vi svaret deres.
        </p>

        <fieldset className="mb-8">
          <legend className="text-lg font-semibold text-gray-900 mb-3">
            Kommer trivselslederne fra skolen på kurs?
          </legend>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setKommer(true)}
              aria-pressed={kommer === true}
              className={
                kommer === true
                  ? 'flex-1 py-3 px-4 rounded-xl border-2 border-orange-500 bg-orange-50 text-orange-700 font-semibold'
                  : 'flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-medium hover:border-gray-300'
              }
            >
              Ja, vi kommer
            </button>
            <button
              type="button"
              onClick={() => setKommer(false)}
              aria-pressed={kommer === false}
              className={
                kommer === false
                  ? 'flex-1 py-3 px-4 rounded-xl border-2 border-pink-600 bg-pink-50 text-pink-700 font-semibold'
                  : 'flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-medium hover:border-gray-300'
              }
            >
              Nei, vi kommer ikke
            </button>
          </div>
        </fieldset>

        {kommer === true && (
          <div className="mb-8">
            <label htmlFor="antallTl" className="block text-lg font-semibold text-gray-900 mb-2">
              Ca. hvor mange trivselsledere kommer?
            </label>
            <input
              id="antallTl"
              type="number"
              min="0"
              inputMode="numeric"
              value={antallTl}
              onChange={(e) => setAntallTl(e.target.value)}
              className="w-32 py-3 px-4 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none text-lg"
            />
          </div>
        )}

        {visVertskap && (
          <fieldset className="mb-8">
            <legend className="text-lg font-semibold text-gray-900 mb-3">
              Kan skolen bekrefte at dere kan være vertskap kursdagen?
            </legend>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setErVertskap(true)}
                aria-pressed={erVertskap === true}
                className={
                  erVertskap === true
                    ? 'flex-1 py-3 px-4 rounded-xl border-2 border-orange-500 bg-orange-50 text-orange-700 font-semibold'
                    : 'flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-medium hover:border-gray-300'
                }
              >
                Ja, vi kan være vertskap
              </button>
              <button
                type="button"
                onClick={() => setErVertskap(false)}
                aria-pressed={erVertskap === false}
                className={
                  erVertskap === false
                    ? 'flex-1 py-3 px-4 rounded-xl border-2 border-pink-600 bg-pink-50 text-pink-700 font-semibold'
                    : 'flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-medium hover:border-gray-300'
                }
              >
                Nei
              </button>
            </div>
            {erVertskap === false && (
              <div className="mt-4">
                <label htmlFor="arsakVertskap" className="block text-sm font-medium text-gray-700 mb-1">
                  Hvorfor ikke? (valgfritt)
                </label>
                <input
                  id="arsakVertskap"
                  type="text"
                  value={arsakIkkeVertskap}
                  onChange={(e) => setArsakIkkeVertskap(e.target.value)}
                  className="w-full py-3 px-4 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none"
                />
              </div>
            )}
          </fieldset>
        )}

        {kommer === false && (
          <div className="mb-8">
            <label htmlFor="arsakKomme" className="block text-lg font-semibold text-gray-900 mb-2">
              Hvorfor kommer dere ikke?
            </label>
            <textarea
              id="arsakKomme"
              rows="3"
              value={arsakIkkeKomme}
              onChange={(e) => setArsakIkkeKomme(e.target.value)}
              className="w-full py-3 px-4 rounded-xl border-2 border-gray-200 focus:border-pink-600 focus:outline-none"
            />
          </div>
        )}

        {kommer === false && (
          <div className="mb-8">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={apenForAnnet}
                onChange={(e) => setApenForAnnet(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-gray-800">
                Vi kunne tenke oss å delta på et annet lekekurs i nærheten, hvis det er mulig.
                <span className="block text-sm text-gray-500 mt-1">
                  Vi i Trivselsleder kontakter deg med forslag til andre kurs i nærheten.
                </span>
              </span>
            </label>
          </div>
        )}

        {kommer === true && (
          <div className="mb-8">
            <label htmlFor="kommentar" className="block text-lg font-semibold text-gray-900 mb-2">
              Er det annen informasjon som er relevant for kursholder eller kursdagen?{' '}
              <span className="font-normal text-gray-500">(valgfritt)</span>
            </label>
            <textarea
              id="kommentar"
              rows="3"
              value={kommentar}
              onChange={(e) => setKommentar(e.target.value)}
              className="w-full py-3 px-4 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none"
            />
          </div>
        )}

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
          {sender ? 'Sender …' : 'Send svar'}
        </button>
      </div>
    </main>
  );
}
