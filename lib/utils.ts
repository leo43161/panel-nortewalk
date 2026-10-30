import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInCalendarDays, parseISO } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function daysUntil(date?: string | null): number | null {
  if (!date) return null
  try {
    return differenceInCalendarDays(parseISO(date), new Date())
  } catch {
    return null
  }
}

export function formatDate(date?: string | null): string {
  if (!date) return "—"
  try {
    return parseISO(date).toLocaleDateString("es-AR")
  } catch {
    return date
  }
}

/** "Caminata Histórica" -> "caminata-historica" */
export function slugify(s: string, max = 140): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
}

/** 150 -> "2 h 30 min", 45 -> "45 min", 120 -> "2 h" */
export function formatDuration(min?: number | string | null): string {
  const m = Number(min)
  if (!Number.isFinite(m) || m <= 0) return "—"
  const h = Math.floor(m / 60)
  const r = m % 60
  if (!h) return `${r} min`
  return r ? `${h} h ${r} min` : `${h} h`
}

/**
 * Saca lat/lng de lo que la gente pega: un link de Google Maps
 * (".../@-26.83,-65.20,17z", "...!3d-26.83!4d-65.20", "?q=-26.83,-65.20")
 * o coordenadas sueltas ("-26.8305, -65.2038").
 * Los links cortos (maps.app.goo.gl) no traen coordenadas: devuelve null.
 */
export function parseMapsLocation(input: string): { lat: number; lng: number } | null {
  const pin = input.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
  const pair = input.match(/(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/)
  const m = pin ?? pair
  if (!m) return null
  const lat = Number(m[1])
  const lng = Number(m[2])
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}

/* ---------------- Fechas (siempre en hora local, nunca UTC) ---------------- */

/** Date -> "2026-10-30" en hora local (toISOString usa UTC: a las 22 h en Argentina ya es "mañana"). */
export function isoDate(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}

/** Hoy + N días, como "YYYY-MM-DD". */
export function isoDaysFromToday(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

function localDay(iso: string): Date {
  return new Date(iso.slice(0, 10) + "T00:00:00")
}

/** "Hoy", "Mañana", "Ayer" o "sáb 31 oct". */
export function dayLabel(iso?: string | null): string {
  if (!iso) return "—"
  const diff = daysUntil(iso.slice(0, 10))
  if (diff === 0) return "Hoy"
  if (diff === 1) return "Mañana"
  if (diff === -1) return "Ayer"
  return localDay(iso)
    .toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })
    .replace(/\./g, "")
}

/** "sábado 31 de octubre" */
export function longDay(iso: string): string {
  return localDay(iso).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
}

/** "10:30:00" -> "10:30" */
export function hhmm(time?: string | null): string {
  return time ? time.slice(0, 5) : ""
}

/** "2 personas", "1 persona" */
export function people(n: number | string | null | undefined): string {
  const v = Number(n) || 0
  return `${v} ${v === 1 ? "persona" : "personas"}`
}

/** "31 de diciembre de 2027" */
export function fullDate(iso?: string | null): string {
  if (!iso) return "—"
  return localDay(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
}
