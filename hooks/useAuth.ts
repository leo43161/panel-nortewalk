"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AUTH_EVENT, clearToken, decodeToken, getToken, isTokenValid, setToken } from "@/lib/auth"
import type { Role } from "@/types"

// El token vive en localStorage: se lee como store externo, así todos los
// componentes ven el mismo usuario y se enteran al instante de login/logout.
function subscribe(onChange: () => void) {
  window.addEventListener(AUTH_EVENT, onChange)
  window.addEventListener("storage", onChange)
  return () => {
    window.removeEventListener(AUTH_EVENT, onChange)
    window.removeEventListener("storage", onChange)
  }
}
const validToken = () => {
  const t = getToken()
  return t && isTokenValid(t) ? t : null
}
const noSubscribe = () => () => {}

export function useAuth() {
  const router = useRouter()
  const token = React.useSyncExternalStore(subscribe, validToken, () => null)
  // false en el render del servidor / hidratación, true después: recién ahí se sabe si hay sesión.
  const ready = React.useSyncExternalStore(noSubscribe, () => true, () => false)
  const user = React.useMemo(() => (token ? decodeToken(token) : null), [token])

  const login = React.useCallback((t: string) => setToken(t), [])
  const logout = React.useCallback(() => {
    clearToken()
    router.push("/login")
  }, [router])
  const hasRole = React.useCallback((allowed: Role[]) => !!user && allowed.includes(user.role), [user])

  return { ready, user, login, logout, hasRole, isAuthenticated: !!user }
}
