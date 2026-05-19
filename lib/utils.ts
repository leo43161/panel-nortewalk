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
