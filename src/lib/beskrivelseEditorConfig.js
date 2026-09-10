// Delt TipTap-konfigurasjon for lek-beskrivelsen. Ligger for seg selv (uten React) så
// den kan testes headless med nøyaktig SAMME extension-oppsett som redigereren bruker.
// Se BeskrivelseEditor.jsx for helheten.
import StarterKit from '@tiptap/starter-kit'

// StarterKit strippet til de ti taggene beskrivelse.js viser (krav 2). Alt utenfor
// skjemaet er `false`, så tastatur, verktøyknapper OG innliming kan bare produsere disse.
export const UTVIDELSER = [
  StarterKit.configure({
    heading: { levels: [3] },   // KUN h3 (mellomoverskrift)
    blockquote: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    strike: false,
    underline: false,
    link: false,
    trailingNode: false,        // ellers får hver lagret beskrivelse en tom <p> på slutten
  }),
]

// Escape av ren tekst før den pakkes i <p>…</p>.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Ren tekst → avsnitt, speiler delAvsnitt i beskrivelse.js: tom linje = nytt avsnitt,
// enkelt linjeskift = <br> inne i avsnittet.
export function tekstTilHtml(txt) {
  const avsnitt = String(txt)
    .replace(/\r\n/g, '\n')
    .split(/\n[ \t]*\n/)
    .map((s) => s.replace(/^\n+|\n+$/g, ''))
    .filter((s) => s.trim().length)
  if (!avsnitt.length) return ''
  return avsnitt.map((a) => '<p>' + esc(a).replace(/\n/g, '<br>') + '</p>').join('')
}

// Innhold editoren starter med. HTML sendes urørt inn (TipTap normaliserer selv). De 8
// rene-tekst-radene har ingen tagger → gjøres til avsnitt, ellers ville HTML-parsing
// kollapset doble linjeskift til mellomrom (krav 2: «ren tekst vises som avsnitt»).
export function startInnhold(value) {
  if (value == null || !String(value).trim()) return ''
  const body = new DOMParser().parseFromString(String(value), 'text/html').body
  if (body && body.querySelector('*')) return String(value)     // allerede HTML
  return tekstTilHtml(body ? body.textContent : String(value))
}
