"use client"

import * as React from "react"
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Phone,
  UserCheck,
  UserX,
  Users,
} from "lucide-react"

import { LOCALE_LABEL } from "@/lib/labels"
import {
  MESSAGE_KIND_LABEL,
  mailtoLink,
  relativeTime,
  whatsappLink,
  type MessageKind,
} from "@/lib/leads"
import { cn, dayLabel, daysUntil, hhmm, longDay, people } from "@/lib/utils"
import type { Lead, LeadStatus, Locale } from "@/types"

import { buttonVariants, Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/page"
import { LEAD_STATUS, LeadStatusBadge } from "@/components/leads/status-badge"
import { isPending, useSetLeadStatus } from "@/components/provider/queries"

const MESSAGE_KINDS: MessageKind[] = ["confirm", "reminder", "reschedule", "thanks"]
const STATUS_ORDER: LeadStatus[] = ["new", "contacted", "confirmed", "attended", "no_show", "lost", "spam"]

export const tourLocale = (l: Lead) => (l.schedule_locale ?? l.preferred_locale) as Locale
export const fullName = (l: Lead) => [l.tourist_name, l.tourist_surname].filter(Boolean).join(" ")

/** "2 adultos + 1 niño" */
export function paxDetail(l: Lead): string {
  const adults = Number(l.pax_adults) || Number(l.pax) || 1
  const kids = Number(l.pax_children) || 0
  const a = `${adults} adulto${adults === 1 ? "" : "s"}`
  return kids ? `${a} + ${kids} niño${kids === 1 ? "" : "s"}` : a
}

/** El mensaje que tiene sentido mandar ahora. */
function suggestedMessage(l: Lead): MessageKind {
  if (l.status === "attended") return "thanks"
  if (l.status === "confirmed" && (daysUntil(l.desired_date) ?? 9) <= 1) return "reminder"
  return "confirm"
}

/** La salida ya llegó (hoy o antes): se puede marcar si vino. */
const tripStarted = (l: Lead) => (daysUntil(l.desired_date) ?? 1) <= 0

/* ------------------------------------------------------------------ */

/** WhatsApp con el mensaje sugerido en 1 toque + menú con los otros mensajes. */
function WhatsAppButton({ lead, compact }: { lead: Lead; compact?: boolean }) {
  const setStatus = useSetLeadStatus()
  const locale = tourLocale(lead)
  const kind = suggestedMessage(lead)
  const href = whatsappLink(lead, kind)
  // Escribirle a una reserva nueva = ya la contactaste (un paso menos para el guía).
  const onOpen = () => {
    if (lead.status === "new") setStatus.mutate({ id: lead.id, status: "contacted", silent: true })
  }

  if (!href) {
    return (
      <span className="text-muted-foreground inline-flex h-9 items-center text-xs">Sin WhatsApp válido</span>
    )
  }

  const green = "bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700"
  return (
    <div className="inline-flex">
      <a
        href={href}
        target="_blank"
        rel="noopener"
        onClick={onOpen}
        title={`${MESSAGE_KIND_LABEL[kind]} (en ${LOCALE_LABEL[locale].toLowerCase()})`}
        aria-label={compact ? `WhatsApp: ${MESSAGE_KIND_LABEL[kind]}` : undefined}
        className={cn(buttonVariants({ size: compact ? "icon" : "default" }), green, "rounded-r-none")}
      >
        <MessageCircle />
        {!compact && "WhatsApp"}
      </a>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Elegir otro mensaje"
          className={cn(
            buttonVariants({ size: "icon" }),
            green,
            "w-8 rounded-l-none border-l border-white/25 pointer-coarse:w-9"
          )}
        >
          <ChevronDown />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
              Se escribe solo, en {LOCALE_LABEL[locale].toLowerCase()}
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          {MESSAGE_KINDS.map((k) => (
            <DropdownMenuItem
              key={k}
              onClick={onOpen}
              render={<a href={whatsappLink(lead, k) ?? "#"} target="_blank" rel="noopener" />}
            >
              <span className="flex-1">{MESSAGE_KIND_LABEL[k]}</span>
              {k === kind && <span className="text-muted-foreground text-xs">sugerido</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/** Menú "⋯": llamar, mail y cambiar a cualquier estado (con explicación). */
function MoreMenu({ lead }: { lead: Lead }) {
  const setStatus = useSetLeadStatus()
  const mail = mailtoLink(lead)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Más opciones para la reserva de ${lead.tourist_name}`}
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem render={<a href={`tel:${lead.tourist_phone}`} />}>
          <Phone />
          Llamar · <span className="text-muted-foreground tabular-nums">{lead.tourist_phone}</span>
        </DropdownMenuItem>
        {mail && (
          <DropdownMenuItem render={<a href={mail} />}>
            <Mail />
            Mandar email
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs">Marcar como…</DropdownMenuLabel>
          {STATUS_ORDER.filter((s) => s !== lead.status).map((s) => (
            <DropdownMenuItem key={s} onClick={() => setStatus.mutate({ id: lead.id, status: s })}>
              <span aria-hidden className={cn("size-2 rounded-full", LEAD_STATUS[s].dot)} />
              <span className="flex-1">
                <span className="block">{LEAD_STATUS[s].label}</span>
                <span className="text-muted-foreground block text-xs">{LEAD_STATUS[s].hint}</span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** La acción principal según el momento: confirmar, o después de la salida, ¿vino? */
function StatusShortcut({ lead, compact }: { lead: Lead; compact?: boolean }) {
  const setStatus = useSetLeadStatus()
  const busy = setStatus.isPending
  if (isPending(lead)) {
    return (
      <Button
        variant="outline"
        size={compact ? "sm" : "default"}
        disabled={busy}
        onClick={() => setStatus.mutate({ id: lead.id, status: "confirmed" })}
      >
        <Check className="text-emerald-700 dark:text-emerald-400" />
        Confirmar
      </Button>
    )
  }
  if (lead.status === "confirmed" && tripStarted(lead)) {
    return (
      <div className="inline-flex gap-1.5">
        <Button variant="outline" size={compact ? "sm" : "default"} disabled={busy} onClick={() => setStatus.mutate({ id: lead.id, status: "attended" })}>
          <UserCheck />
          Vino
        </Button>
        <Button variant="ghost" size={compact ? "sm" : "default"} disabled={busy} onClick={() => setStatus.mutate({ id: lead.id, status: "no_show" })}>
          <UserX />
          No vino
        </Button>
      </div>
    )
  }
  return null
}

/* ------------------------------------------------------------------ */

/** Tarjeta completa: para responder una reserva o verla en el historial. */
export function BookingCard({ lead }: { lead: Lead }) {
  const locale = tourLocale(lead)
  return (
    <article
      className={cn(
        "bg-card rounded-xl border p-4 shadow-xs sm:p-5",
        lead.status === "new" && "border-highlight/40 ring-highlight/15 ring-2"
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <LeadStatusBadge status={lead.status} />
        <span className="text-muted-foreground">pidió {relativeTime(lead.created_at)}</span>
        {lead.booking_code && (
          <span className="text-muted-foreground ml-auto font-mono text-xs tracking-wide">{lead.booking_code}</span>
        )}
      </div>

      <h3 className="mt-3 text-lg leading-tight font-semibold">{fullName(lead)}</h3>
      <p className="text-muted-foreground mt-0.5 text-sm">{lead.experience_title}</p>

      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Salida</dt>
          <CalendarDays className="text-muted-foreground size-4" />
          <dd className="font-medium">
            {dayLabel(lead.desired_date)}
            {lead.desired_time && ` · ${hhmm(lead.desired_time)}`}
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Personas</dt>
          <Users className="text-muted-foreground size-4" />
          <dd>
            <span className="font-medium">{people(lead.pax)}</span>
            <span className="text-muted-foreground"> ({paxDetail(lead)})</span>
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Idioma</dt>
          <dd className="bg-muted rounded-md px-2 py-0.5 text-xs font-medium">{LOCALE_LABEL[locale]}</dd>
        </div>
      </dl>

      {lead.message && (
        <blockquote className="bg-muted/60 text-foreground/85 mt-3 rounded-lg border-l-2 border-l-primary/30 px-3 py-2 text-sm">
          {lead.message}
        </blockquote>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <WhatsAppButton lead={lead} />
        <StatusShortcut lead={lead} />
        <div className="ml-auto">
          <MoreMenu lead={lead} />
        </div>
      </div>
    </article>
  )
}

/* ------------------------------------------------------------------ */

export interface Departure {
  key: string
  date: string
  time: string
  experienceTitle: string
  locale: Locale
  capacity: number | null
  /** Personas que ocupan lugar (nuevas + contactadas + confirmadas), igual que el cupo de la DB. */
  taken: number
  leads: Lead[]
}

/** Agrupa reservas en salidas: mismo día + hora + experiencia + idioma. */
export function groupDepartures(leads: Lead[]): Departure[] {
  const map = new Map<string, Departure>()
  for (const l of leads) {
    const time = hhmm(l.desired_time ?? l.schedule_time)
    const locale = tourLocale(l)
    const key = `${l.desired_date}|${time}|${l.experience_id}|${locale}`
    let d = map.get(key)
    if (!d) {
      d = {
        key,
        date: l.desired_date.slice(0, 10),
        time,
        experienceTitle: l.experience_title ?? "Experiencia",
        locale,
        capacity: l.schedule_capacity ?? null,
        taken: 0,
        leads: [],
      }
      map.set(key, d)
    }
    d.leads.push(l)
    if (l.status === "new" || l.status === "contacted" || l.status === "confirmed") d.taken += Number(l.pax) || 0
  }
  return [...map.values()].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
}

/** Una salida de la agenda: hora, experiencia, idioma, ocupación y quiénes van. */
export function DepartureCard({ departure: d }: { departure: Departure }) {
  const full = d.capacity != null && d.taken >= d.capacity
  return (
    <section className="bg-card overflow-hidden rounded-xl border shadow-xs">
      <header className="flex items-start gap-3 border-b px-4 py-3 sm:px-5">
        <span className="bg-primary/10 text-primary flex h-11 min-w-14 flex-col items-center justify-center rounded-lg px-2 leading-none">
          <Clock className="mb-1 size-3.5 opacity-70" />
          <span className="text-[0.9375rem] font-semibold tabular-nums">{d.time || "—"}</span>
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="leading-snug font-semibold">{d.experienceTitle}</h3>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {LOCALE_LABEL[d.locale]} · {people(d.taken)}
            {d.capacity != null && (
              <span className={cn(full && "text-highlight-foreground font-medium")}>
                {" "}· {full ? "completa" : `quedan ${d.capacity - d.taken} de ${d.capacity} lugares`}
              </span>
            )}
          </p>
        </div>
      </header>
      <ul className="divide-y">
        {d.leads.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
            <div className="min-w-0 flex-1 basis-48">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{fullName(l)}</span>
                <LeadStatusBadge status={l.status} />
              </div>
              <p className="text-muted-foreground mt-0.5 truncate text-sm">
                {paxDetail(l)}
                {l.message && <> · “{l.message}”</>}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusShortcut lead={l} compact />
              <WhatsAppButton lead={l} compact />
              <MoreMenu lead={l} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Próximas salidas, día por día. */
export function Agenda({ leads, limitDays }: { leads: Lead[]; limitDays?: number }) {
  const departures = groupDepartures(leads)
  const days = [...new Set(departures.map((d) => d.date))].slice(0, limitDays)

  if (!days.length) {
    return (
      <EmptyState icon={CalendarDays} title="Sin salidas con reservas">
        Cuando alguien reserve una de tus experiencias, la salida aparece acá con quiénes van.
      </EmptyState>
    )
  }
  return (
    <div className="space-y-6">
      {days.map((day) => {
        const items = departures.filter((d) => d.date === day)
        const total = items.reduce((s, d) => s + d.taken, 0)
        const relative = dayLabel(day)
        return (
          <section key={day} aria-label={longDay(day)}>
            <h2 className="bg-background/95 sticky top-14 z-10 -mx-1 mb-2 flex items-baseline gap-2 px-1 py-2 backdrop-blur md:top-0">
              <span className="text-base font-semibold first-letter:uppercase">
                {relative === "Hoy" || relative === "Mañana" ? `${relative} · ${longDay(day)}` : longDay(day)}
              </span>
              <span className="text-muted-foreground text-sm">{people(total)}</span>
            </h2>
            <div className="space-y-3">
              {items.map((d) => (
                <DepartureCard key={d.key} departure={d} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
