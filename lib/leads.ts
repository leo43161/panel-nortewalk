import type { Lead, Locale } from "@/types"

const TEMPLATES: Record<Locale, (l: Lead) => string> = {
  es: (l) =>
    `¡Hola ${l.tourist_name}! Te contactamos desde ${l.provider_name ?? "Norte Walk"} por tu reserva de "${l.experience_title ?? "la experiencia"}" para el ${l.desired_date}${l.desired_time ? " a las " + l.desired_time.slice(0, 5) : ""} (${l.pax} pax).`,
  en: (l) =>
    `Hi ${l.tourist_name}! Reaching out from ${l.provider_name ?? "Norte Walk"} about your booking for "${l.experience_title ?? "our experience"}" on ${l.desired_date}${l.desired_time ? " at " + l.desired_time.slice(0, 5) : ""} (${l.pax} pax).`,
  pt: (l) =>
    `Olá ${l.tourist_name}! Aqui é ${l.provider_name ?? "Norte Walk"}, sobre sua reserva para "${l.experience_title ?? "a experiência"}" no dia ${l.desired_date}${l.desired_time ? " às " + l.desired_time.slice(0, 5) : ""} (${l.pax} pax).`,
}

/** Normaliza un número E.164/local a sólo dígitos para wa.me */
export function toWhatsAppDigits(raw?: string | null): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, "")
  return digits.length >= 7 ? digits : null
}

/** Construye una URL wa.me con mensaje preformateado en el idioma del turista. */
export function whatsappLink(lead: Lead): string | null {
  const digits = toWhatsAppDigits(lead.tourist_phone)
  if (!digits) return null
  const tpl = TEMPLATES[lead.preferred_locale] ?? TEMPLATES.es
  const text = encodeURIComponent(tpl(lead))
  return `https://wa.me/${digits}?text=${text}`
}

/** mailto: con asunto + cuerpo. */
export function mailtoLink(lead: Lead): string | null {
  if (!lead.tourist_email) return null
  const subject = encodeURIComponent(
    `${lead.provider_name ?? "Norte Walk"} — ${lead.experience_title ?? "Reserva"}`
  )
  const tpl = TEMPLATES[lead.preferred_locale] ?? TEMPLATES.es
  const body = encodeURIComponent(tpl(lead))
  return `mailto:${lead.tourist_email}?subject=${subject}&body=${body}`
}

/** Devuelve "hace 3 min", "hace 2 h", "hace 4 d" o fecha absoluta si >30d. */
export function relativeTime(iso?: string | null): string {
  if (!iso) return "—"
  const date = new Date(iso.replace(" ", "T"))
  if (Number.isNaN(date.getTime())) return iso
  const diffMs = Date.now() - date.getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return "ahora"
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `hace ${d} d`
  return date.toLocaleDateString("es-AR")
}

/** ISO date "YYYY-MM-DD" de hace N días. */
export function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

/** ISO date "YYYY-MM-DD" del primer día del mes actual. */
export function isoFirstOfMonth(): string {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}
