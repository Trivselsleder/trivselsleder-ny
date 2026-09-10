// Tekstredigerer for lek-beskrivelsen (ressurs_innhold.beskrivelse).
// Lastes KUN i redigeringsflaten (via React.lazy i LekRedigering) — lekesiden og
// lekebiblioteket henter ALDRI TipTap (krav 4).
//
// LÅST TIL DE TI TAGGENE beskrivelse.js viser (krav 2): avsnitt (p), linjeskift (br),
// fet (strong), kursiv (em), punktliste (ul>li), nummerert liste (ol>li),
// mellomoverskrift (h3). Alt annet i StarterKit er slått av, så både tastatur-
// snarveier, verktøyknappene OG innliming fra Word/Docs kan bare produsere disse.
// TipTap normaliserer ved innlasting (b→strong, i→em, tekst→p) og kan ikke lage
// tagger utenfor skjemaet — clipboard-innhold konformeres til skjemaet ved innliming.
//
// «RØRT»-FLAGGET (krav 1): onUpdate fyrer IKKE når innholdet settes via `content`-
// opsjonen (kun onCreate gjør det). Så første innlasting kaller aldri onChange —
// beskrivelsen regnes som endret KUN når brukeren faktisk redigerer. Foreldren
// (LekRedigering) setter et rørt-flagg fra onChange og sender beskrivelsen bare da.
import { useEditor, EditorContent, useEditorState } from '@tiptap/react'
import { UTVIDELSER, startInnhold } from '../lib/beskrivelseEditorConfig'

// Én verktøyknapp. aria-pressed for aktiv formatering, synlig fokusring, ingen oransje
// tekst på hvit flate (petrol-flate + hvit tekst når aktiv, ellers grå tekst).
function Knapp({ pa, onClick, aria, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}   // behold markering/fokus i editoren
      onClick={onClick}
      aria-pressed={pa}
      aria-label={aria}
      title={aria}
      className={
        'px-2.5 py-1 rounded text-sm font-medium border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol ' +
        (pa ? 'bg-petrol text-white border-petrol' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100')
      }
    >
      {children}
    </button>
  )
}

export default function BeskrivelseEditor({ value, onChange, labels }) {
  const editor = useEditor({
    extensions: UTVIDELSER,
    content: startInnhold(value),           // fyrer IKKE onUpdate → rører ikke flagget
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': labels.omrade,
        class:
          'tl-beskrivelse-editor min-h-[110px] w-full border border-gray-300 rounded-b-lg px-3 py-2 text-sm ' +
          'focus:outline-none focus:border-petrol prose-none',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),   // KUN ekte brukerendring
  })

  // Aktiv-tilstand for verktøylinja. v3 re-rendrer ikke på hver transaksjon, så vi
  // abonnerer eksplisitt på isActive-flaggene vi trenger.
  const st = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      fet: e ? e.isActive('bold') : false,
      kursiv: e ? e.isActive('italic') : false,
      punkt: e ? e.isActive('bulletList') : false,
      nummer: e ? e.isActive('orderedList') : false,
      h3: e ? e.isActive('heading', { level: 3 }) : false,
    }),
  })

  if (!editor) return null
  const kjede = () => editor.chain().focus()

  return (
    <div className="mt-0.5">
      <div
        role="toolbar"
        aria-label={labels.omrade}
        aria-controls={undefined}
        className="flex flex-wrap gap-1 border border-gray-300 border-b-0 rounded-t-lg bg-gray-50 px-2 py-1.5"
      >
        <Knapp pa={st.fet} aria={labels.fet} onClick={() => kjede().toggleBold().run()}><b>F</b></Knapp>
        <Knapp pa={st.kursiv} aria={labels.kursiv} onClick={() => kjede().toggleItalic().run()}><i>K</i></Knapp>
        <Knapp pa={st.h3} aria={labels.mellomoverskrift} onClick={() => kjede().toggleHeading({ level: 3 }).run()}>H</Knapp>
        <Knapp pa={st.punkt} aria={labels.punktliste} onClick={() => kjede().toggleBulletList().run()}>• —</Knapp>
        <Knapp pa={st.nummer} aria={labels.nummerliste} onClick={() => kjede().toggleOrderedList().run()}>1. —</Knapp>
      </div>
      <EditorContent editor={editor} />
      {/* Tailwind preflight nullstiller list-style/heading — gi editoren tilbake punkter,
          numre og h3-vekt så redigeringen ser ut som visningen. Speiler beskrivelse.js. */}
      <style>{`
        .tl-beskrivelse-editor ul { list-style: disc; padding-left: 1.25rem; }
        .tl-beskrivelse-editor ol { list-style: decimal; padding-left: 1.25rem; }
        .tl-beskrivelse-editor li { margin: 0.125rem 0; }
        .tl-beskrivelse-editor li > p { margin: 0; }
        .tl-beskrivelse-editor h3 { font-weight: 700; margin-top: 0.75rem; }
        .tl-beskrivelse-editor p { margin: 0.35rem 0; }
        .tl-beskrivelse-editor:focus-visible { outline: none; }
      `}</style>
    </div>
  )
}
