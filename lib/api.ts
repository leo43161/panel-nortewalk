import axios, { AxiosError, AxiosHeaders } from "axios"
import { clearToken, getToken } from "@/lib/auth"
import type { ApiResponse } from "@/types"

const baseURL = process.env.NEXT_PUBLIC_API_URL

if (!baseURL && typeof window !== "undefined") {
  console.warn("NEXT_PUBLIC_API_URL is not defined")
}

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    const headers = AxiosHeaders.from(config.headers)
    headers.set("Authorization", `Bearer ${token}`)
    config.headers = headers
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      clearToken()
      const onLogin = window.location.pathname.startsWith("/login")
      if (!onLogin) {
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)

export function apiErrorMessage(err: unknown, fallback = "Error inesperado"): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiResponse<unknown> | undefined
    return data?.message || err.message || fallback
  }
  if (err instanceof Error) return err.message
  return fallback
}
