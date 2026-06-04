"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { CalendarDays, Loader2, Users } from "lucide-react"

import { api, apiErrorMessage } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import type { ApiResponse, Lead } from "@/types"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { LeadRow } from "@/components/provider/lead-row"

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function isoPlusDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatLongDate(iso: string): string {
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

function groupByDate(leads: Lead[]): Record<string, Lead[]> {
  return leads.reduce<Record<string, Lead[]>>((acc, l) => {
    const k = l.desired_date
    if (!acc[k]) acc[k] = []
    acc[k].push(l)
    return acc
  }, {})
}

export default function ProviderReservasPage() {
  const { user } = useAuth()
  const providerId = user?.providerId

  // Próximas reservas (60 días): confirmed + contacted + attended
  const upcoming = useQuery({
    queryKey: ["provider-reservas", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      // El backend filtra por un solo status, así que hacemos 2 llamadas y juntamos.
      const params = {
        from_date: todayIso(),
        to_date: isoPlusDays(60),
        limit: 200,
      }
      const [confirmed, contacted] = await Promise.all([
        api.get<ApiResponse<Lead[]>>("/lead_list", {
          params: { ...params, status: "confirmed" },
        }),
        api.get<ApiResponse<Lead[]>>("/lead_list", {
          params: { ...params, status: "contacted" },
        }),
      ])
      const all = [...(confirmed.data.data ?? []), ...(contacted.data.data ?? [])]
      return all.sort((a, b) => {
        const d = a.desired_date.localeCompare(b.desired_date)
        if (d !== 0) return d
        return (a.desired_time ?? "").localeCompare(b.desired_time ?? "")
      })
    },
  })

  const grouped = React.useMemo(
    () => (upcoming.data ? groupByDate(upcoming.data) : {}),
    [upcoming.data]
  )
  const dates = Object.keys(grouped).sort()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reservas</h1>
        <p className="text-muted-foreground text-sm">
          Próximas excursiones con turistas. Confirmá la asistencia desde acá.
        </p>
      </div>

      {upcoming.isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : upcoming.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{apiErrorMessage(upcoming.error)}</AlertDescription>
        </Alert>
      ) : dates.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-sm">
            <CalendarDays className="size-8 opacity-40" />
            No hay reservas próximas en los próximos 60 días.
          </CardContent>
        </Card>
      ) : (
        dates.map((date) => {
          const rows = grouped[date]
          const totalPax = rows.reduce((s, l) => s + (Number(l.pax) || 0), 0)
          const confirmedCount = rows.filter(
            (l) => l.status === "confirmed"
          ).length
          return (
            <section key={date} className="space-y-2">
              <div className="flex items-baseline justify-between gap-2 border-b pb-1">
                <h2 className="text-base font-semibold tracking-tight capitalize">
                  {formatLongDate(date)}
                </h2>
                <div className="flex items-center gap-3 text-xs">
                  <Badge variant="secondary" className="gap-1">
                    <Users className="size-3" />
                    {totalPax} pax
                  </Badge>
                  <span className="text-muted-foreground">
                    {confirmedCount}/{rows.length} confirmados
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {rows.map((l) => (
                  <LeadRow key={l.id} lead={l} />
                ))}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}
