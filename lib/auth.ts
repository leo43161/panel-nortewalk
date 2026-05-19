import { jwtDecode } from "jwt-decode"
import type { JwtPayload, Role } from "@/types"

const TOKEN_KEY = "nw_token"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  if (typeof window === "undefined") return
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  if (typeof window === "undefined") return
  localStorage.removeItem(TOKEN_KEY)
}

export function decodeToken(token?: string | null): JwtPayload | null {
  const t = token ?? getToken()
  if (!t) return null
  try {
    return jwtDecode<JwtPayload>(t)
  } catch {
    return null
  }
}

export function isTokenValid(token?: string | null): boolean {
  const payload = decodeToken(token)
  if (!payload?.exp) return false
  return payload.exp * 1000 > Date.now()
}

export function hasRole(allowed: Role[], token?: string | null): boolean {
  const payload = decodeToken(token)
  return !!payload && allowed.includes(payload.role)
}
