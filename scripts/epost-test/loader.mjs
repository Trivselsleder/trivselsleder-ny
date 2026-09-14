// ESM-loader: bytter ut '@supabase/supabase-js' og 'resend' med mocks, så handlerne kan drives
// uten ekte database eller e-post. Brukes via register.mjs (node --import).
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const SUPA = pathToFileURL(path.join(DIR, 'mock-supabase.mjs')).href
const RESEND = pathToFileURL(path.join(DIR, 'mock-resend.mjs')).href

export async function resolve(spec, ctx, next) {
  if (spec === '@supabase/supabase-js') return { url: SUPA, shortCircuit: true }
  if (spec === 'resend') return { url: RESEND, shortCircuit: true }
  return next(spec, ctx)
}
