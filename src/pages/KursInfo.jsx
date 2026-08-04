import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fyllPlassholdere, fjernTommePlassholderLinjer } from '../lib/maltekst';

// A5 — Kursinformasjonssiden.
//
// Skolen kommer hit på to måter, begge med sin egen lenke:
//   1) rett etter at de har svart «ja, vi kommer» (/kursinfo/:token?takk=1)
//   2) fra påminnelses-e-posten, uker senere
//
// TO LAG:
//   ØVERST  kursspesifikke fakta (dato, hall, oppmøte, vertskap) hentet fra
//           basen — SAMME kilde som e-postene, så siden er alltid oppdatert
//           hvis RA endrer noe.
//   UNDER   én felles tekst for ALLE skoler, lagret i innstillinger som
//           kursinfo_tekst og redigerbar av de ansatte. Pluss et valgfritt
//           «spesielt for dette kurset» fra kurs.kursinfo_tillegg.
//
// Alt hentes gjennom RPC-en hent_kursinfo_via_token, som er SECURITY DEFINER.
// Den leser innstillinger på skolens vegne, så anon trenger ALDRI leserett på
// den tabellen (der bor motor_aktiv og avsenderadressene).
//
// FORMATTERING i den redigerbare teksten — med vilje så enkel at en ansatt kan
// bruke den uten å kunne HTML:
//   ## Overskrift        → mellomtittel
//   - punkt              → punktliste
//   tom linje            → nytt avsnitt
//   [tekst](/min-side)   → lenke (skråstrek = intern, http = ekstern)
// Teksten settes ALDRI inn som HTML — den bygges som React-elementer, så en
// feilskrevet mal kan ikke bli et sikkerhetshull.

// Godkjente lenkemål. Alt annet (f.eks. javascript:) blir stående som ren tekst.
function trygglenke(url) {
  return /^(https?:\/\/|mailto:|tel:|\/)/i.test(url);
}

// [tekst](url) → <a>/<Link>. Resten av linja blir stående som ren tekst.
function tolkLenker(tekst, nokkel) {
  const deler = [];
  const monster = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let sist = 0;
  let treff;
  let i = 0;
  while ((treff = monster.exec(tekst)) !== null) {
    if (treff.index > sist) deler.push(tekst.slice(sist, treff.index));
    const etikett = treff[1];
    const url = treff[2];
    const stil = 'text-magenta underline underline-offset-2 hover:no-underline';
    if (!trygglenke(url)) {
      deler.push(treff[0]);
    } else if (url.startsWith('/')) {
      deler.push(<Link key={`${nokkel}-a${i}`} to={url} className={stil}>{etikett}</Link>);
    } else {
      deler.push(
        <a key={`${nokkel}-a${i}`} href={url} target="_blank" rel="noopener noreferrer" className={stil}>
          {etikett}
        </a>
      );
    }
    i += 1;
    sist = treff.index + treff[0].length;
  }
  if (sist < tekst.length) deler.push(tekst.slice(sist));
  return deler;
}

// Linjer → blokker (overskrift / liste / avsnitt).
function tilBlokker(tekst) {
  const linjer = String(tekst || '').replace(/\r\n/g, '\n').split('\n');
  const blokker = [];
  let punkter = null;
  let avsnitt = null;
  const lukkListe = () => { if (punkter) { blokker.push({ type: 'liste', linjer: punkter }); punkter = null; } };
  const lukkAvsnitt = () => { if (avsnitt) { blokker.push({ type: 'avsnitt', linjer: avsnitt }); avsnitt = null; } };

  for (const raa of linjer) {
    const linje = raa.trim();
    if (linje === '') { lukkListe(); lukkAvsnitt(); continue; }
    if (linje.startsWith('## ')) {
      lukkListe(); lukkAvsnitt();
      blokker.push({ type: 'overskrift', tekst: linje.slice(3).trim() });
      continue;
    }
    if (/^[-*]\s+/.test(linje)) {
      lukkAvsnitt();
      if (!punkter) punkter = [];
      punkter.push(linje.replace(/^[-*]\s+/, ''));
      continue;
    }
    lukkListe();
    if (!avsnitt) avsnitt = [];
    avsnitt.push(linje);
  }
  lukkListe(); lukkAvsnitt();
  return blokker;
}

function Maltekst({ tekst }) {
  const blokker = tilBlokker(tekst);
  return (
    <>
      {blokker.map((b, i) => {
        if (b.type === 'overskrift') {
          return (
            <h2 key={`b${i}`} className="text-xl font-bold text-gray-900 mt-8 mb-3 first:mt-0">
              {b.tekst}
            </h2>
          );
        }
        if (b.type === 'liste') {
          return (
            <ul key={`b${i}`} className="list-disc pl-6 space-y-1.5 mb-4 text-gray-700">
              {b.linjer.map((l, j) => <li key={`b${i}p${j}`}>{tolkLenker(l, `b${i}p${j}`)}</li>)}
            </ul>
          );
        }
        return (
          <p key={`b${i}`} className="mb-4 text-gray-700 leading-relaxed">
            {b.linjer.map((l, j) => (
              <span key={`b${i}l${j}`}>
                {j > 0 && <br />}
                {tolkLenker(l, `b${i}l${j}`)}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}

export default function KursInfo() {
  const { token } = useParams();
  const [sokeparam] = useSearchParams();
  const visTakk = sokeparam.get('takk') === '1';

  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState('');
  const [info, setInfo] = useState(null);

  useEffect(() => {
    let aktiv = true;
    async function hent() {
      setLaster(true);
      setFeil('');
      const { data, error } = await supabase.rpc('hent_kursinfo_via_token', { token });
      if (!aktiv) return;
      if (error) {
        setFeil('Noe gikk galt da vi hentet kursinformasjonen. Prøv igjen, eller ta kontakt med oss.');
        setLaster(false);
        return;
      }
      if (!data || data.length === 0) {
        setFeil('Vi fant ikke kursinformasjonen deres. Sjekk at du har brukt hele lenken fra e-posten.');
        setLaster(false);
        return;
      }
      setInfo(data[0]);
      setLaster(false);
    }
    hent();
    return () => { aktiv = false; };
  }, [token]);

  if (laster) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-lg text-gray-600">Laster kursinformasjonen …</p>
      </main>
    );
  }

  // Går henting av kursinfoen galt for en skole som NETTOPP har svart, skal de
  // like fullt se at svaret kom fram. Kvitteringen er det viktigste; siden er
  // et tillegg. Å vise bare en feilmelding ville fått skolen til å tro at
  // svaret forsvant.
  if (feil) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          {visTakk && (
            <>
              <div className="text-5xl mb-4" aria-hidden="true">✓</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Takk for svaret!</h1>
              <p className="text-gray-700 mb-6">Svaret deres er registrert.</p>
            </>
          )}
          <p className="text-gray-800">{feil}</p>
        </div>
      </main>
    );
  }

  const oppmotetid = info.kurs_oppmotetid ? info.kurs_oppmotetid.slice(0, 5) : '';
  const sluttid = info.kurs_slutt_tid ? info.kurs_slutt_tid.slice(0, 5) : '';
  const starttid = info.kurs_start_tid ? info.kurs_start_tid.slice(0, 5) : '';
  const kursdato = info.kurs_dato
    ? new Date(info.kurs_dato).toLocaleDateString('nb-NO', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      })
    : '';

  // Samme plassholdere som e-postene bruker, så en setning kan flyttes mellom
  // e-post og side uten å skrives om.
  const verdier = {
    skolenavn: info.skole_navn || '',
    kursnavn: info.kurs_navn || '',
    kursdato,
    hall: info.hall_navn || '',
    oppmotetid,
    sluttid,
    vertskapsnotat: info.vertskapsnotat || '',
  };
  const fellesTekst = fyllPlassholdere(
    fjernTommePlassholderLinjer(info.kursinfo_tekst || '', verdier),
    verdier
  );
  const tillegg = (info.kursinfo_tillegg || '').trim();

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {visTakk && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4" role="status">
            <p className="font-semibold text-green-900">Takk for svaret!</p>
            <p className="text-sm text-green-800 mt-0.5">
              Svaret deres er registrert. Under finner dere alt dere trenger å vite før kursdagen.
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            Kursinformasjon
          </h1>
          <p className="text-gray-600 mb-8">
            Alt dere trenger å vite før lekekurset. Ta gjerne vare på denne lenken.
          </p>

          {/* Kursspesifikk topp — samme kilde som e-postene. Linjer uten
              innhold vises ikke i det hele tatt (samme regel som i e-post). */}
          <div className="mb-8 rounded-xl border-l-4 border-orange bg-orange-50 px-4 py-3">
            <h2 className="sr-only">Fakta om deres kurs</h2>
            {info.skole_navn && (
              <p className="text-sm text-gray-700">
                <span className="text-gray-500">Skole:</span> <strong>{info.skole_navn}</strong>
              </p>
            )}
            {info.kurs_navn && (
              <p className="text-sm text-gray-700">
                <span className="text-gray-500">Kurs:</span> <strong>{info.kurs_navn}</strong>
              </p>
            )}
            {kursdato && (
              <p className="text-sm text-gray-700">
                <span className="text-gray-500">Dato:</span> <strong>{kursdato}</strong>
                {starttid && <> kl. {starttid}{sluttid && <>–{sluttid}</>}</>}
              </p>
            )}
            {info.hall_navn && (
              <p className="text-sm text-gray-700">
                <span className="text-gray-500">Sted:</span> <strong>{info.hall_navn}</strong>
              </p>
            )}
            {oppmotetid && (
              <p className="text-sm text-gray-700 mt-1">
                <span className="text-gray-500">Oppmøte:</span> <strong>{oppmotetid}</strong>
              </p>
            )}
            {info.er_vertskap && info.vertskapsnotat && (
              <p className="text-sm text-gray-700 mt-2 pt-2 border-t border-orange-200">
                {info.vertskapsnotat}
              </p>
            )}
          </div>

          {/* Spesielt for dette kurset — vises kun når RA har fylt det ut. */}
          {tillegg && (
            <div className="mb-8 rounded-xl border-l-4 border-magenta bg-pink-50 px-4 py-4">
              <h2 className="text-base font-bold text-gray-900 mb-2">Spesielt for dette kurset</h2>
              <div className="text-sm [&_p:last-child]:mb-0">
                <Maltekst tekst={tillegg} />
              </div>
            </div>
          )}

          {/* Den felles teksten — lik for alle skoler, redigeres i innstillinger. */}
          <Maltekst tekst={fellesTekst} />
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Denne lenken er personlig for skolen deres. Del den gjerne med de andre voksne som blir med.
        </p>
      </div>
    </main>
  );
}
