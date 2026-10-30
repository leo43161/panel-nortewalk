"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ChevronRight, Inbox, MessageCircle, Search } from "lucide-react"

import { api, apiErrorMessage } from "@/lib/api"
import { cn, dayLabel, hhmm, isoDate } from "@/lib/utils"
import { isoDaysAgo, isoFirstOfMonth, relativeTime, whatsappLink } from "@/lib/leads"
import type { ApiResponse, Lead, LeadStatus } from "@/types"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState, ListSkeleton, PageHeader } from "@/components/page"
import { LEAD_STATUS, LeadStatusBadge } from "@/components/leads/status-badge"
import { BookingCard, fullName } from "@/components/provider/booking"
import { normalizeLead, useSetLeadStatus } from "@/components/provider/queries"

const PAGE_SIZE = 50

const STATUS_FILTERS: (LeadStatus | "all")[] = ["all", "new", "contacted", "confirmed", "attended", "no_show", "lost", "spam"]

const RANGES: { value: string; label: string; from: () => string }[] = [
  { value: "7d", label: "Últimos 7 días", from: () => isoDaysAgo(6) },
  { value: "30d", label: "Últimos 30 días", from: () => isoDaysAgo(29) },
  { value: "month", label: "Este mes", from: isoFirstOfMonth },
  { value: "all", label: "Desde siempre", from: () => "" },
]

export default function LeadsPage() {
  const [status, setStatus] = React.useState<LeadStatus | "all">("all")
  const [range, setRange] = React.useState("30d")
  const [search, setSearch] = React.useState("")
  // La página vuelve a 0 cuando cambian los filtros (se deriva, sin effect).
  const filterKey = `${status}|${range}`
  const [paging, setPaging] = React.useState({ key: filterKey, page: 0 })
  const page = paging.key === filterKey ? paging.page : 0

  const fromDate = RANGES.find((r) => r.value === range)?.from() ?? ""
  const query = useQuery({
    queryKey: ["leads", "admin", { status, fromDate, page }],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Lead[]>>("/lead_list", {
        params: {
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          status: status === "all" ? undefined : status,
          from_date: fromDate || undefined,
          to_date: fromDate ? isoDate() : undefined,
        },
      })
      return { rows: (data.data ?? []).map(normalizeLead), total: data.meta?.total ?? 0 }
    },
  })

  const total = query.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const q = search.trim().toLowerCase()
  const rows = (query.data?.rows ?? []).filter(
    (l) =>
      !q ||
      [fullName(l), l.tourist_phone, l.tourist_email, l.experience_title, l.provider_name, l.booking_code]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
  )
  const filtered = status !== "all" || !!q

  return (
    <>
      <PageHeader
        title="Reservas"
        description={
          query.isLoading ? "Cargando…" : `${total} ${total === 1 ? "reserva recibida" : "reservas recibidas"} en el período.`
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-80">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre, teléfono, código o guía"
            aria-label="Buscar reservas"
            className="pl-9"
          />
        </div>
        <Select value={range} onValueChange={(v) => setRange(String(v))}>
          <SelectTrigger className="w-full lg:w-48" aria-label="Período">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="-mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {STATUS_FILTERS.map((s) => (
          <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
            {s === "all" ? "Todas" : LEAD_STATUS[s].label}
          </Chip>
        ))}
      </div>

      {query.isLoading ? (
        <ListSkeleton />
      ) : query.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{apiErrorMessage(query.error)}</AlertDescription>
        </Alert>
      ) : rows.length === 0 ? (
        <EmptyState icon={filtered ? Search : Inbox} title={filtered ? "Nada con esos filtros" : "Sin reservas en este período"}>
          {filtered ? "Probá con otro estado o búsqueda." : "Elegí un período más largo para ver reservas anteriores."}
        </EmptyState>
      ) : (
        <>
          {/* Celular: tarjetas. Escritorio: tabla. */}
          <div className="grid gap-3 md:hidden">
            {rows.map((l) => (
              <BookingCard key={l.id} lead={l} />
            ))}
          </div>
          <div className="bg-card hidden overflow-x-auto rounded-xl border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Turista</TableHead>
                  <TableHead>Experiencia</TableHead>
                  <TableHead>Salida</TableHead>
                  <TableHead className="text-right">Personas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden xl:table-cell">Recibida</TableHead>
                  <TableHead className="w-0 pr-4">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((l) => (
                  <LeadTableRow key={l.id} lead={l} />
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-sm tabular-nums">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0 || query.isFetching} onClick={() => setPaging({ key: filterKey, page: page - 1 })}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1 || query.isFetching} onClick={() => setPaging({ key: filterKey, page: page + 1 })}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}

function LeadTableRow({ lead: l }: { lead: Lead }) {
  const setStatus = useSetLeadStatus()
  const wa = whatsappLink(l)
  return (
    <TableRow className={cn(l.status === "new" && "bg-highlight-soft/60")}>
      <TableCell className="max-w-56 pl-4">
        <Link href={`/leads/${l.id}`} className="block truncate font-medium hover:underline">
          {fullName(l)}
        </Link>
        <span className="text-muted-foreground block truncate text-sm tabular-nums">{l.tourist_phone}</span>
      </TableCell>
      <TableCell className="max-w-72">
        <Link href={`/experiences/${l.experience_id}`} className="block truncate hover:underline" title={l.experience_title ?? ""}>
          {l.experience_title}
        </Link>
        <Link href={`/providers/${l.provider_id}`} className="text-muted-foreground block truncate text-sm hover:underline">
          {l.provider_name}
        </Link>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {dayLabel(l.desired_date)}
        {l.desired_time && <span className="text-muted-foreground"> · {hhmm(l.desired_time)}</span>}
      </TableCell>
      <TableCell className="text-right tabular-nums">{l.pax}</TableCell>
      <TableCell>
        <Select value={l.status} onValueChange={(v) => v && v !== l.status && setStatus.mutate({ id: l.id, status: v as LeadStatus })}>
          <SelectTrigger size="sm" aria-label="Cambiar estado" className="border-transparent bg-transparent px-1 hover:border-input">
            <LeadStatusBadge status={l.status} />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(LEAD_STATUS) as LeadStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {LEAD_STATUS[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-muted-foreground hidden whitespace-nowrap xl:table-cell">{relativeTime(l.created_at)}</TableCell>
      <TableCell className="pr-4">
        <div className="flex items-center justify-end gap-1">
          {wa && (
            <a href={wa} target="_blank" rel="noopener" aria-label={`WhatsApp a ${l.tourist_name}`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
              <MessageCircle className="text-emerald-700 dark:text-emerald-400" />
            </a>
          )}
          <Link href={`/leads/${l.id}`} aria-label="Ver detalle" className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
            <ChevronRight />
          </Link>
        </div>
      </TableCell>
    </TableRow>
  )
}
