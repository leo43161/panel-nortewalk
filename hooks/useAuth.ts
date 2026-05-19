"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  clearToken,
  decodeToken,
  getToken,
  isTokenValid,
  setToken,
} from "@/lib/auth"
import type { JwtPayload, Role } from "@/types"

export function useAuth() {
  const router = useRouter()
  const [ready, setReady] = React.useState(false)
  const [user, setUser] = React.useState<JwtPayload | null>(null)

  React.useEffect(() => {
    const token = getToken()
    if (token && isTokenValid(token)) {
      setUser(decodeToken(token))
    } else if (token) {
      clearToken()
    }
    setReady(true)
  }, [])

  const login = React.useCallback(
    (token: string) => {
      setToken(token)
      setUser(decodeToken(token))
    },
    []
  )

  const logout = React.useCallback(() => {
    clearToken()
    setUser(null)
    router.push("/login")
  }, [router])

  const hasRole = React.useCallback(
    (allowed: Role[]) => !!user && allowed.includes(user.role),
    [user]
  )

  return { ready, user, login, logout, hasRole, isAuthenticated: !!user }
}
