"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  CalendarDays,
  Eye,
  Loader2,
  Mail,
  MessageCircle,
  Search,
  Users,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { api, apiErrorMessage } from "@/lib/api"
import { cn, formatDate } from "@/lib/utils"
import {
  isoDaysAgo,
  isoFirstOfMonth,
  mailtoLink,
  relativeTime,
  whatsappLink,
} from "@/lib/leads"
import type { ApiResponse, Lead, LeadStatus, Vertical } from "@/types"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  LEAD_STATUS_LABELS,
  LeadStatusBadge,
} from "@/components/leads/status-badge"

const PAGE_SIZE = 50

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  ...Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
]

const DATE_PRESETS: { value: string; label: string }[] = [
  { value: "all", label: "Cualquier fecha" },
  { value: "today", label: "Hoy" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "month", label: "Este mes" },
  { value: "custom", label: "Personalizado" },
]

const VERTICAL_STYLES: Record<Vertical, string> = {
  fwt: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  adventure:
    "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  experience:
    "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  gastronomy: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
}

function applyDatePreset(preset: string): { from: string; to: string } {
  const today = new Date().toISOString().slice(0, 10)
  switch (preset) {
    case "today":
      return { from: today, to: today }
    case "7d":
      return { from: isoDaysAgo(6), to: today }
    case "30d":
      return { from: isoDaysAgo(29), to: today }
    case "month":
      return { from: isoFirstOfMonth(), to: today }
    default:
      return { from: "", to: "" }
  }
}

export default function LeadsPage() {
  const [status, setStatus] = React.useState("all")
  const [datePreset, setDatePreset] = React.useState("30d")
  const [fromDate, setFromDate] = React.useState(() => isoDaysAgo(29))
  const [toDate, setToDate] = React.useState(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(0)
  const qc = useQueryClient()

  React.useEffect(() => {
    setPage(0)
  }, [status, fromDate, toDate])

  const query = useQuery({
    queryKey: ["leads", { status, fromDate, toDate, page }],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }
      if (status !== "all") params.status = status
      if (fromDate) params.from_date = fromDate
      if (toDate) params.to_date = toDate
      const { data } = await api.get<ApiResponse<Lead[]>>("/lead_list", {
        params,
      })
      return { rows: data.data, total: data.meta?.total ?? 0 }
    },
  })

  const updateStatus = useMutation({
    mutationFn: async (input: { id: number; status: LeadStatus }) => {
      await api.post<ApiResponse<unknown>>("/lead_update_status", input)
    },
    onSuccess: () => {
      toast.success("Estado actualizado")
      qc.invalidateQueries({ queryKey: ["leads"] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const rows = query.data?.rows ?? []
  const total = query.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Filtro client-side por texto (nombre, teléfono, email, experiencia, proveedor)
  const filteredRows = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((l) =>
      [
        l.tourist_name,
        l.tourist_phone,
        l.tourist_email,
        l.experience_title,
        l.provider_name,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    )
  }, [rows, search])

  // Stats agrupadas (página actual)
  const stats = React.useMemo(() => {
    const counts: Record<LeadStatus, number> = {
      new: 0,
      contacted: 0,
      confirmed: 0,
      attended: 0,
      no_show: 0,
      lost: 0,
      spam: 0,
    }
    rows.forEach((r) => {
      counts[r.status] = (counts[r.status] ?? 0) + 1
    })
    return counts
  }, [rows])

  const handlePreset = (preset: string) => {
    setDatePreset(preset)
    if (preset === "custom") return
    if (preset === "all") {
      setFromDate("")
      setToDate("")
      return
    }
    const r = applyDatePreset(preset)
    setFromDate(r.from)
    setToDate(r.to)
  }

  const filtersActive =
    status !== "all" || fromDate !== "" || toDate !== "" || search !== ""

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
        <p className="text-muted-foreground text-sm">
          {query.isFetching
            ? "Cargando…"
            : `${total} ${total === 1 ? "lead" : "leads"} en el rango`}
          {totalPages > 1 && ` — página ${page + 1} de ${totalPages}`}
        </p>
      </div>

      {/* Quick stats sobre la página actual */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <StatChip
            label="Nuevos"
            value={stats.new}
            active={status === "new"}
            onClick={() => setStatus(status === "new" ? "all" : "new")}
            tone="blue"
          />
          <StatChip
            label="Contactados"
            value={stats.contacted}
            active={status === "contacted"}
            onClick={() =>
              setStatus(status === "contacted" ? "all" : "contacted")
            }
            tone="amber"
          />
          <StatChip
            label="Confirmados"
            value={stats.confirmed}
            active={status === "confirmed"}
            onClick={() =>
              setStatus(status === "confirmed" ? "all" : "confirmed")
            }
            tone="cyan"
          />
          <StatChip
            label="Asistieron"
            value={stats.attended}
            active={status === "attended"}
            onClick={() =>
              setStatus(status === "attended" ? "all" : "attended")
            }
            tone="emerald"
          />
          <StatChip
            label="No asistió"
            value={stats.no_show}
            active={status === "no_show"}
            onClick={() =>
              setStatus(status === "no_show" ? "all" : "no_show")
            }
            tone="amber"
          />
          <StatChip
            label="Perdidos"
            value={stats.lost}
            active={status === "lost"}
            onClick={() => setStatus(status === "lost" ? "all" : "lost")}
            tone="zinc"
          />
          <StatChip
            label="Spam"
            value={stats.spam}
            active={status === "spam"}
            onClick={() => setStatus(status === "spam" ? "all" : "spam")}
            tone="red"
          />
        </div>
      )}

      {/* Filtros */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-end gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nombre, teléfono, email…"
              className="pl-8"
            />
          </div>
          <div className="grid gap-1">
            <label className="text-muted-foreground text-xs">Estado</label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v ?? "all")}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <label className="text-muted-foreground text-xs">Rango</label>
            <Select
              value={datePreset}
              onValueChange={(v) => handlePreset(v ?? "all")}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {datePreset === "custom" && (
            <>
              <div className="grid gap-1">
                <label className="text-muted-foreground text-xs">Desde</label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-44"
                />
              </div>
              <div className="grid gap-1">
                <label className="text-muted-foreground text-xs">Hasta</label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-44"
                />
              </div>
            </>
          )}
          {filtersActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatus("all")
                setSearch("")
                handlePreset("30d")
              }}
            >
              <X className="size-4" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {query.isError && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo cargar leads</AlertTitle>
          <AlertDescription>{apiErrorMessage(query.error)}</AlertDescription>
        </Alert>
      )}

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[18%]">Recibido</TableHead>
              <TableHead className="w-[24%]">Turista</TableHead>
              <TableHead>Experiencia</TableHead>
              <TableHead>Deseado</TableHead>
              <TableHead className="text-right">Pax</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32">
                  <div className="flex items-center justify-center">
                    <Loader2 className="text-muted-foreground size-5 animate-spin" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground h-32 text-center"
                >
                  {filtersActive ? (
                    <>
                      Sin leads que coincidan.
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => {
                          setStatus("all")
                          setSearch("")
                          handlePreset("30d")
                        }}
                      >
                        Limpiar filtros
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-2 py-4">
                      <Users className="text-muted-foreground mx-auto size-8" />
                      <p>Todavía no hay leads en este rango.</p>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((l) => {
                const isNew = l.status === "new"
                const wa = whatsappLink(l)
                const mail = mailtoLink(l)
                return (
                  <TableRow
                    key={l.id}
                    className={cn(
                      isNew && "bg-blue-50/40 dark:bg-blue-950/20"
                    )}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span
                          className={cn(
                            "text-sm",
                            isNew && "font-semibold"
                          )}
                          title={l.created_at}
                        >
                          {relativeTime(l.created_at)}
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          {formatDate(l.created_at)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-0 flex-col">
                        <Link
                          href={`/leads/${l.id}`}
                          className="truncate font-medium hover:underline"
                        >
                          {l.tourist_name}
                        </Link>
                        <span className="text-muted-foreground truncate text-xs">
                          {l.tourist_phone}
                          {l.tourist_email && ` · ${l.tourist_email}`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-0 flex-col">
                        <Link
                          href={`/experiences/${l.experience_id}`}
                          className="truncate text-sm hover:underline"
                          title={l.experience_title ?? ""}
                        >
                          {l.experience_title ?? `#${l.experience_id}`}
                        </Link>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          {l.vertical && (
                            <Badge
                              variant="secondary"
                              className={cn(
                                "px-1 py-0 text-[10px] capitalize",
                                VERTICAL_STYLES[l.vertical]
                              )}
                            >
                              {l.vertical}
                            </Badge>
                          )}
                          <Link
                            href={`/providers/${l.provider_id}`}
                            className="text-muted-foreground truncate hover:underline"
                          >
                            {l.provider_name ?? `#${l.provider_id}`}
                          </Link>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <CalendarDays className="text-muted-foreground size-3.5" />
                        {formatDate(l.desired_date)}
                        {l.desired_time && (
                          <span className="text-muted-foreground font-mono text-xs">
                            {l.desired_time.slice(0, 5)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {l.pax}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={l.status}
                        onValueChange={(v) =>
                          v &&
                          v !== l.status &&
                          updateStatus.mutate({
                            id: l.id,
                            status: v as LeadStatus,
                          })
                        }
                      >
                        <SelectTrigger className="h-7 w-36">
                          <LeadStatusBadge status={l.status} />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(LEAD_STATUS_LABELS).map(
                            ([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonVariants({
                              variant: "ghost",
                              size: "icon-sm",
                            })}
                            title="WhatsApp al turista"
                          >
                            <MessageCircle className="size-4 text-emerald-600" />
                          </a>
                        )}
                        {mail && (
                          <a
                            href={mail}
                            className={buttonVariants({
                              variant: "ghost",
                              size: "icon-sm",
                            })}
                            title="Email al turista"
                          >
                            <Mail className="size-4" />
                          </a>
                        )}
                        <Link
                          href={`/leads/${l.id}`}
                          className={buttonVariants({
                            variant: "ghost",
                            size: "icon-sm",
                          })}
                          title="Ver detalle"
                        >
                          <Eye className="size-4" />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          {total > 0 &&
            `${page * PAGE_SIZE + 1}–${Math.min(
              (page + 1) * PAGE_SIZE,
              total
            )} de ${total}`}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0 || query.isFetching}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1 || query.isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}

const STAT_TONES = {
  blue: "border-blue-200 bg-blue-50/60 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200",
  cyan: "border-cyan-200 bg-cyan-50/60 text-cyan-900 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-200",
  amber:
    "border-amber-200 bg-amber-50/60 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
  emerald:
    "border-emerald-200 bg-emerald-50/60 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200",
  zinc: "border-zinc-200 bg-zinc-50/60 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-300",
  red: "border-red-200 bg-red-50/60 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200",
} as const

function StatChip({
  label,
  value,
  active,
  onClick,
  tone,
}: {
  label: string
  value: number
  active: boolean
  onClick: () => void
  tone: keyof typeof STAT_TONES
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition",
        STAT_TONES[tone],
        active
          ? "ring-2 ring-offset-1 ring-current/30"
          : "hover:brightness-95"
      )}
    >
      <span className="text-xs font-medium">{label}</span>
      <span className="text-lg font-bold tabular-nums leading-none">
        {value}
      </span>
    </button>
  )
}
