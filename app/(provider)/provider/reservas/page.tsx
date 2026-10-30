"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Inbox, PartyPopper, Search } from "lucide-react"

import { api, apiErrorMessage } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"
import type { ApiResponse, Lead, LeadStatus } from "@/types"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Chip } from "@/components/ui/chip"
import { Input } from "@/components/ui/input"
import { EmptyState, ListSkeleton, PageHeader } from "@/components/page"
import { LEAD_STATUS } from "@/components/leads/status-badge"
import { Agenda, BookingCard, fullName } from "@/components/provider/booking"
import { isPending, normalizeLead, useBookings } from "@/components/provider/queries"

type View = "pendientes" | "proximas" | "historial"

export default function ReservasPage() {
  return (
    <React.Suspense fallback={<ListSkeleton />}>
      <Reservas />
    </React.Suspense>
  )
}

function Reservas() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const bookings = useBookings()

  const all = bookings.data ?? []
  const pending = all.filter(isPending).sort((a, b) =>
    a.status === b.status ? b.created_at.localeCompare(a.created_at) : a.status === "new" ? -1 : 1
  )
  const upcoming = all.filter((l) => l.status !== "lost" && l.status !== "spam")

  // Sin ?vista: si hay algo para responder arranca ahí, si no en la agenda.
  const view = (params.get("vista") as View | null) ?? (pending.length ? "pendientes" : "proximas")
  const go = (v: View) => router.replace(`${pathname}?vista=${v}`, { scroll: false })

  const tabs: { value: View; label: string; short?: string; count?: number }[] = [
    { value: "pendientes", label: "Por confirmar", count: pending.length },
    { value: "proximas", label: "Próximas salidas", short: "Próximas" },
    { value: "historial", label: "Historial" },
  ]

  return (
    <>
      <PageHeader
        title="Reservas"
        description="Escribile a cada turista por WhatsApp con un toque: el mensaje sale armado en su idioma."
      />

      <div role="tablist" aria-label="Vista" className="bg-muted mb-5 flex w-full gap-1 rounded-xl p-1 sm:w-fit">
        {tabs.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={view === t.value}
            onClick={() => go(t.value)}
            className={cn(
              "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-sm sm:px-3 font-medium whitespace-nowrap transition-colors sm:flex-none pointer-coarse:h-10",
              view === t.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.short ? (
              <>
                <span className="sm:hidden">{t.short}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </>
            ) : (
              t.label
            )}
            {!!t.count && (
              <span className="bg-highlight flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-white tabular-nums">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {view === "historial" ? (
        <History />
      ) : bookings.isLoading ? (
        <ListSkeleton />
      ) : bookings.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{apiErrorMessage(bookings.error)}</AlertDescription>
        </Alert>
      ) : view === "pendientes" ? (
        pending.length === 0 ? (
          <EmptyState icon={PartyPopper} title="Estás al día" action={<Link className="text-primary text-sm font-medium hover:underline" href="?vista=proximas">Ver próximas salidas</Link>}>
            Ninguna reserva espera tu confirmación.
          </EmptyState>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {pending.map((l) => (
              <BookingCard key={l.id} lead={l} />
            ))}
          </div>
        )
      ) : (
        <Agenda leads={upcoming} />
      )}
    </>
  )
}

const HISTORY_FILTERS: { value: LeadStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "attended", label: LEAD_STATUS.attended.label },
  { value: "no_show", label: LEAD_STATUS.no_show.label },
  { value: "lost", label: "Canceladas" },
]

/** Todas las reservas, de la más nueva a la más vieja (incluye salidas pasadas). */
function History() {
  const { user } = useAuth()
  const providerId = user?.providerId
  const [status, setStatus] = React.useState<LeadStatus | "all">("all")
  const [q, setQ] = React.useState("")

  const leads = useQuery({
    queryKey: ["leads", providerId, status],
    enabled: !!providerId,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Lead[]>>("/lead_list", {
        params: { status: status === "all" ? undefined : status, limit: 200 },
      })
      return (data.data ?? []).map(normalizeLead)
    },
  })

  const needle = q.trim().toLowerCase()
  const rows = (leads.data ?? []).filter(
    (l) =>
      !needle ||
      [fullName(l), l.tourist_phone, l.tourist_email, l.experience_title, l.booking_code]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle))
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-80">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, teléfono o código"
            aria-label="Buscar reservas"
            className="pl-9"
          />
        </div>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
          {HISTORY_FILTERS.map((f) => (
            <Chip key={f.value} active={status === f.value} onClick={() => setStatus(f.value)}>
              {f.label}
            </Chip>
          ))}
        </div>
      </div>

      {leads.isLoading ? (
        <ListSkeleton />
      ) : leads.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{apiErrorMessage(leads.error)}</AlertDescription>
        </Alert>
      ) : rows.length === 0 ? (
        <EmptyState icon={needle || status !== "all" ? Search : Inbox} title={needle || status !== "all" ? "Nada con ese filtro" : "Todavía no hay reservas"}>
          {needle || status !== "all" ? "Probá con otro nombre o estado." : "Acá vas a ver todas las reservas, también las de salidas pasadas."}
        </EmptyState>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((l) => (
            <BookingCard key={l.id} lead={l} />
          ))}
        </div>
      )}
    </div>
  )
}

