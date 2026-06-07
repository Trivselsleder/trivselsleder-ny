import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [bruker, setBruker] = useState(null)
  const [laster, setLaster] = useState(true)

  async function hentProfil(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return data
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session) setBruker(await hentProfil(session.user.id))
      setLaster(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session) {
        setBruker(await hentProfil(session.user.id))
      } else {
        setBruker(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loggInn(epost, passord) {
    const { error } = await supabase.auth.signInWithPassword({ email: epost, password: passord })
    if (error) throw error
  }

  async function loggUt() {
    await supabase.auth.signOut()
  }

  async function glemmtPassord(epost) {
    const { error } = await supabase.auth.resetPasswordForEmail(epost, {
      redirectTo: `${window.location.origin}/sett-passord`,
    })
    if (error) throw error
  }

  async function settNyttPassord(passord) {
    const { error } = await supabase.auth.updateUser({ password: passord })
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ session, bruker, laster, loggInn, loggUt, glemmtPassord, settNyttPassord }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
