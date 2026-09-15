import { useEffect } from 'react'

// Laster SVG-spriten (public/tl-ikoner.svg) ÉN gang og injiserer den skjult i document.body, slik
// at alle lekekort/rutenett kan referere symbolene med <use href="#tl-…"> uten å laste fila på nytt
// per ikon (847 leker = 847 <use>, men bare ÉN nedlasting). Modul-guard hindrer dobbel injeksjon
// (også ved React StrictMode-dobbeltmontering).
let injisert = false

export default function TlIkonSprite() {
  useEffect(() => {
    if (injisert || document.getElementById('tl-ikoner-sprite')) return
    injisert = true
    fetch('/tl-ikoner.svg')
      .then((r) => r.text())
      .then((svg) => {
        const holder = document.createElement('div')
        holder.id = 'tl-ikoner-sprite'
        holder.setAttribute('aria-hidden', 'true')
        holder.style.display = 'none'
        holder.innerHTML = svg
        document.body.appendChild(holder)
      })
      .catch((e) => {
        injisert = false // la et senere forsøk prøve igjen
        console.warn('[tl-ikoner] kunne ikke laste sprite:', e?.message || e)
      })
  }, [])
  return null
}
