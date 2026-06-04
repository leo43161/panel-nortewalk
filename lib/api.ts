import axios, { AxiosError, AxiosHeaders } from "axios"
import { clearToken, getToken } from "@/lib/auth"
import type { ApiResponse } from "@/types"

const baseURL = process.env.API_URL

if (!baseURL && typeof window !== "undefined") {
  console.warn("API_URL is not defined")
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

export interface UploadResult {
  status: number
  message?: string
  url: string
  public_url?: string
  filename?: string
}

/**
 * Sube un archivo a /upload_image (multipart). Devuelve la URL pública.
 *
 * @example
 * const { url } = await uploadImage(file, { experienceId: 12 })
 */
export async function uploadImage(
  file: File,
  opts: {
    subdir?: string
    experienceId?: number
    providerId?: number
  } = {}
): Promise<UploadResult> {
  const fd = new FormData()
  fd.append("imagen", file)
  if (opts.subdir) fd.append("subdir", opts.subdir)
  if (opts.experienceId) fd.append("experience_id", String(opts.experienceId))
  if (opts.providerId) fd.append("provider_id", String(opts.providerId))

  const { data } = await api.post<ApiResponse<UploadResult>>(
    "/upload_image",
    fd,
    {
      // axios setea boundary automáticamente si dejamos undefined
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    }
  )
  // El backend devuelve los campos en data.data (uploadImage())
  const d = data.data as UploadResult
  if (!d?.url) throw new Error(data.message || "No se obtuvo URL")
  return d
}

export function apiErrorMessage(err: unknown, fallback = "Error inesperado"): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiResponse<unknown> | undefined
    return data?.message || err.message || fallback
  }
  if (err instanceof Error) return err.message
  return fallback
}
