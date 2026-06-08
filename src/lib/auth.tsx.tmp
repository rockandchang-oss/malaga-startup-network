import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "./supabase"

export type Profile = {
  id: string
  full_name: string | null
  role: "superadmin" | "entity_admin" | "editor"
  entity_id: string | null
  avatar_url: string | null
}

type AuthCtx = {
  session: Session | null
  profile: Profile | null
  loading: boolean
  isSuperadmin: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({
  session: null, profile: null, loading: true, isSuperadmin: false,
  signOut: async () => {}, refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("id,full_name,role,entity_id,avatar_url")
      .eq("id", userId)
      .maybeSingle()
    setProfile(data as Profile | null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session) await loadProfile(data.session.user.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s)
      if (s) await loadProfile(s.user.id)
      else setProfile(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <Ctx.Provider value={{
      session, profile, loading,
      isSuperadmin: profile?.role === "superadmin",
      signOut: async () => { await supabase.auth.signOut() },
      refreshProfile: async () => { if (session) await loadProfile(session.user.id) },
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
