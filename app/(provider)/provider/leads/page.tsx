"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Inbox, Loader2, Search, X } from "lucide-react"

import { api, apiErrorMessage } from "@/lib/api"
import { isoDaysAgo } from "@/lib/leads"
import { useAuth } from "@/hooks/useAuth"
import type { ApiResponse, Lead, LeadStatus } from "@/types"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  LEAD_STATUS_LABELS,
} from "@/components/leads/status-badge"
import { LeadRow } from "@/components/provider/lead-row"

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "new", label: "Nuevos" },
  { value: "contacted", label: "Contactados" },
  { value: "confirmed", label: "Confirmados" },
  { value: "attended", label: "Asistieron" },
  { value: "no_show", label: "No asistió" },
  { value: "lost", label: "Perdidos" },
  { value: "spam", label: "Spam" },
]

const DATE_PRESETS = [
  { value: "all", label: "Cualquier fecha" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "today", label: "Hoy" },
]

function presetToFrom(preset: string): string {
  switch (preset) {
    case "today":
      return new Date().toISOString().slice(0, 10)
    case "7d":
      return isoDaysAgo(6)
    case "30d":
      return isoDaysAgo(29)
    default:
      return ""
  }
}

export default function ProviderLeadsPage() {
  const { user } = useAuth()
  const providerId = user?.providerId

  const [status, setStatus] = React.useState<string>("all")
  const [datePreset, setDatePreset] = React.useState("30d")
  const [search, setSearch] = React.useState("")

  const fromDate = presetToFrom(datePreset)

  const leads = useQuery({
    queryKey: ["provider-leads", providerId, status, fromDate],
    enabled: !!providerId,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Lead[]>>("/lead_list", {
        params: {
          status: status === "all" ? undefined : status,
          from_date: fromDate || undefined,
          limit: 200,
        },
      })
      return data.data ?? []
    },
  })

  const filtered = React.useMemo(() => {
    const rows = leads.data ?? []
    if (!search) return rows
    const q = search.toLowerCase()
    return rows.filter((l) =>
      [
        l.tourist_name,
        l.tourist_phone,
        l.tourist_email,
        l.experience_title,
        l.message,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    )
  }, [leads.data, search])

  const filtersActive =
    status !== "all" || datePreset !== "30d" || search !== ""

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mensajes</h1>
        <p className="text-muted-foreground text-sm">
          Turistas que pidieron reserva. Contactalos por WhatsApp y marcá el
          estado a medida que avancen.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, tel, experiencia…"
            className="pl-8"
          />
        </div>

        <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={datePreset}
          onValueChange={(v) => setDatePreset(v ?? "all")}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filtersActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatus("all")
              setDatePreset("30d")
              setSearch("")
            }}
          >
            <X className="size-4" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Contenido */}
      {leads.isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : leads.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{apiErrorMessage(leads.error)}</AlertDescription>
        </Alert>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-sm">
          <Inbox className="size-8 opacity-40" />
          {filtersActive ? "Sin mensajes con esos filtros." : "Sin mensajes."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((l) => (
            <LeadRow key={l.id} lead={l} />
          ))}
        </div>
      )}
    </div>
  )
}
