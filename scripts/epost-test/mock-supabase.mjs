// Mock av '@supabase/supabase-js' for e-post-verntesten. Chainable query-builder som samler opp
// kallene og lar globalThis.__supaResolver(chain) bestemme svaret. Ingen ekte database, ingen nett.
function builder(table) {
  const chain = { table, ops: [], single: null }
  const b = {}
  for (const m of ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'is', 'in', 'order', 'limit', 'filter', 'gte', 'lt']) {
    b[m] = (...a) => { chain.ops.push([m, a]); return b }
  }
  const settle = () => Promise.resolve(globalThis.__supaResolver(chain))
  b.maybeSingle = () => { chain.single = 'maybe'; return settle() }
  b.single = () => { chain.single = 'single'; return settle() }
  b.then = (res, rej) => settle().then(res, rej)
  return b
}

export function createClient() {
  return {
    from: (t) => builder(t),
    rpc: async (navn, args) => (globalThis.__rpcResolver ? globalThis.__rpcResolver(navn, args) : { data: [], error: null }),
    auth: {
      admin: {
        generateLink: async (o) => {
          globalThis.__log?.push({ generateLink: o })
          if (globalThis.__gen) return globalThis.__gen(o)
          return { data: { user: { id: 'user-' + (o.email || '') }, properties: { action_link: 'https://x/invite' } }, error: null }
        },
      },
      getUser: async (tok) => (globalThis.__getUser ? globalThis.__getUser(tok) : { data: { user: { id: 'caller' } } }),
    },
  }
}
export default { createClient }
