import { isoDate } from "@/lib/utils"
import type { Lead, Locale } from "@/types"

/* =====================================================================
 * Mensajes prediseñados para que el guía contacte al turista en 1 click.
 * Cada plantilla sale en el idioma que el turista eligió al reservar.
 * ===================================================================== */

export type MessageKind = "confirm" | "reminder" | "reschedule" | "thanks"

export const MESSAGE_KIND_LABEL: Record<MessageKind, string> = {
  confirm: "Confirmar reserva",
  reminder: "Recordatorio (día antes)",
  reschedule: "Reprogramar salida",
  thanks: "Agradecer asistencia",
}

function paxLine(l: Lead, locale: Locale): string {
  const adults = Number(l.pax_adults) || Number(l.pax) || 1
  const children = Number(l.pax_children) || 0
  if (locale === "en") {
    const a = `${adults} adult${adults === 1 ? "" : "s"}`
    const c = children > 0 ? ` and ${children} child${children === 1 ? "" : "ren"}` : ""
    return a + c
  }
  if (locale === "pt") {
    const a = `${adults} adulto${adults === 1 ? "" : "s"}`
    const c = children > 0 ? ` e ${children} criança${children === 1 ? "" : "s"}` : ""
    return a + c
  }
  const a = `${adults} adulto${adults === 1 ? "" : "s"}`
  const c = children > 0 ? ` y ${children} niño${children === 1 ? "" : "s"}` : ""
  return a + c
}

const DATE_LOCALE: Record<Locale, string> = { es: "es-AR", en: "en-US", pt: "pt-BR" }

/** "sábado 31 de octubre a las 10:30" en el idioma del turista (no "2026-10-31"). */
function when(l: Lead, locale: Locale = "es"): string {
  const date = new Date(l.desired_date.slice(0, 10) + "T00:00:00").toLocaleDateString(DATE_LOCALE[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
  if (!l.desired_time) return date
  const t = l.desired_time.slice(0, 5)
  return `${date} ${locale === "en" ? "at" : locale === "pt" ? "às" : "a las"} ${t}`
}

const TEMPLATES: Record<MessageKind, Record<Locale, (l: Lead) => string>> = {
  confirm: {
    es: (l) =>
      `¡Hola ${l.tourist_name}! Soy ${l.provider_name ?? "tu guía"} de Norte Walk. Te confirmo tu reserva ${l.booking_code ?? ""} para "${l.experience_title ?? "el tour"}" el ${when(l)} (${paxLine(l, "es")}). ¡Nos vemos en el punto de encuentro! Cualquier cosa avisame por acá.`,
    en: (l) =>
      `Hi ${l.tourist_name}! This is ${l.provider_name ?? "your guide"} from Norte Walk. Your booking ${l.booking_code ?? ""} for "${l.experience_title ?? "the tour"}" on ${when(l, "en")} (${paxLine(l, "en")}) is confirmed. See you at the meeting point! Message me here if anything comes up.`,
    pt: (l) =>
      `Olá ${l.tourist_name}! Aqui é ${l.provider_name ?? "seu guia"} do Norte Walk. Sua reserva ${l.booking_code ?? ""} para "${l.experience_title ?? "o tour"}" no ${when(l, "pt")} (${paxLine(l, "pt")}) está confirmada. Te espero no ponto de encontro! Qualquer coisa me avise por aqui.`,
  },
  reminder: {
    es: (l) =>
      `¡Hola ${l.tourist_name}! Te recuerdo que mañana tenemos "${l.experience_title ?? "el tour"}" a las ${l.desired_time?.slice(0, 5) ?? "la hora acordada"}. Reserva ${l.booking_code ?? ""}, ${paxLine(l, "es")}. ¡Te esperamos! Si no llegás a venir, avisame así libero el cupo.`,
    en: (l) =>
      `Hi ${l.tourist_name}! Quick reminder: tomorrow we have "${l.experience_title ?? "the tour"}" at ${l.desired_time?.slice(0, 5) ?? "the agreed time"}. Booking ${l.booking_code ?? ""}, ${paxLine(l, "en")}. See you there! If you can't make it, let me know so I can free up the spots.`,
    pt: (l) =>
      `Olá ${l.tourist_name}! Lembrete: amanhã temos "${l.experience_title ?? "o tour"}" às ${l.desired_time?.slice(0, 5) ?? "hora combinada"}. Reserva ${l.booking_code ?? ""}, ${paxLine(l, "pt")}. Te esperamos! Se não puder vir, me avise para liberar as vagas.`,
  },
  reschedule: {
    es: (l) =>
      `¡Hola ${l.tourist_name}! Soy ${l.provider_name ?? "tu guía"} de Norte Walk, te escribo por tu reserva ${l.booking_code ?? ""} de "${l.experience_title ?? "el tour"}" del ${when(l)}. Tuvimos que mover esa salida, ¿te queda bien reprogramarla? Decime qué día te sirve y lo coordinamos.`,
    en: (l) =>
      `Hi ${l.tourist_name}! This is ${l.provider_name ?? "your guide"} from Norte Walk, about your booking ${l.booking_code ?? ""} for "${l.experience_title ?? "the tour"}" on ${when(l, "en")}. We had to move that departure — would you be open to rescheduling? Tell me what day works and we'll sort it out.`,
    pt: (l) =>
      `Olá ${l.tourist_name}! Aqui é ${l.provider_name ?? "seu guia"} do Norte Walk, sobre sua reserva ${l.booking_code ?? ""} de "${l.experience_title ?? "o tour"}" de ${when(l, "pt")}. Precisamos mover essa saída — podemos reagendar? Me diga que dia funciona para você e combinamos.`,
  },
  thanks: {
    es: (l) =>
      `¡Gracias por venir a "${l.experience_title ?? "el tour"}", ${l.tourist_name}! Fue un gusto mostrarte el norte. Si te gustó, nos ayudás un montón dejando una reseña. ¡Buen viaje! 🌄`,
    en: (l) =>
      `Thanks for joining "${l.experience_title ?? "the tour"}", ${l.tourist_name}! It was a pleasure showing you the North. If you enjoyed it, a review would help us a lot. Safe travels! 🌄`,
    pt: (l) =>
      `Obrigado por participar de "${l.experience_title ?? "o tour"}", ${l.tourist_name}! Foi um prazer mostrar o norte para você. Se gostou, uma avaliação nos ajuda muito. Boa viagem! 🌄`,
  },
}

/** Normaliza un número E.164/local a sólo dígitos para wa.me */
export function toWhatsAppDigits(raw?: string | null): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, "")
  return digits.length >= 7 ? digits : null
}

export function messageFor(lead: Lead, kind: MessageKind = "confirm"): string {
  const tpl = TEMPLATES[kind][lead.preferred_locale] ?? TEMPLATES[kind].es
  return tpl(lead)
}

/** URL wa.me con plantilla en el idioma del turista. */
export function whatsappLink(lead: Lead, kind: MessageKind = "confirm"): string | null {
  const digits = toWhatsAppDigits(lead.tourist_phone)
  if (!digits) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(messageFor(lead, kind))}`
}

/** mailto: con asunto + cuerpo. */
export function mailtoLink(lead: Lead, kind: MessageKind = "confirm"): string | null {
  if (!lead.tourist_email) return null
  const subject = encodeURIComponent(
    `${lead.provider_name ?? "Norte Walk"} — ${lead.experience_title ?? "Reserva"} ${lead.booking_code ?? ""}`.trim()
  )
  const body = encodeURIComponent(messageFor(lead, kind))
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
  return isoDate(d)
}

/** ISO date "YYYY-MM-DD" del primer día del mes actual. */
export function isoFirstOfMonth(): string {
  const d = new Date()
  d.setDate(1)
  return isoDate(d)
}
