"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, CalendarCheck2, CreditCard, Loader2 } from "lucide-react"

import { api, apiErrorMessage } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { formatDate } from "@/lib/utils"
import type {
  ApiResponse,
  Provider,
  ProviderDashboardStats,
  SubscriptionEvent,
} from "@/types"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const STATUS_LABEL: Record<string, string> = {
  active: "Activa",
  trial: "Prueba",
  suspended: "Suspendida",
  banned: "Bloqueada",
}

const STATUS_TONE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  trial: "bg-amber-100 text-amber-800",
  suspended: "bg-red-100 text-red-800",
  banned: "bg-zinc-200 text-zinc-700",
}

const EVENT_LABEL: Record<string, string> = {
  payment: "Pago",
  refund: "Reembolso",
  manual_adjustment: "Ajuste manual",
  suspension: "Suspensión",
  reactivation: "Reactivación",
  trial_start: "Inicio de prueba",
  trial_end: "Fin de prueba",
}

export default function ProviderSuscripcionPage() {
  const { user } = useAuth()
  const providerId = user?.providerId

  const provider = useQuery({
    queryKey: ["provider", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Provider>>("/provider_get", {
        params: { id: providerId },
      })
      return data.data
    },
  })

  const stats = useQuery({
    queryKey: ["provider-dashboard", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ProviderDashboardStats>>(
        "/provider_dashboard",
        { params: { id: providerId } }
      )
      return data.data
    },
  })

  const history = useQuery({
    queryKey: ["provider-sub-history", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<SubscriptionEvent[]>>(
        "/subscription_history",
        { params: { provider_id: providerId, limit: 50 } }
      )
      return data.data ?? []
    },
  })

  const days = stats.data?.days_until_expire ?? null
  const expired = days !== null && days < 0
  const expiringSoon = days !== null && days >= 0 && days <= 7
  const status = provider.data?.status

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Suscripción</h1>
        <p className="text-muted-foreground text-sm">
          Estado de tu cuenta y vencimientos.
        </p>
      </div>

      {(provider.isLoading || stats.isLoading) ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        </div>
      ) : provider.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{apiErrorMessage(provider.error)}</AlertDescription>
        </Alert>
      ) : (
        <>
          {expired && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Suscripción vencida hace {Math.abs(days!)} días</AlertTitle>
              <AlertDescription>
                Tu cuenta no aparece en el sitio público. Contactá al admin para
                regularizar.
              </AlertDescription>
            </Alert>
          )}
          {!expired && expiringSoon && (
            <Alert>
              <AlertTriangle className="size-4" />
              <AlertTitle>Vence en {days} días</AlertTitle>
              <AlertDescription>
                Renová a tiempo para no perder visibilidad.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Estado</CardDescription>
                <CardTitle className="text-base">
                  {status && (
                    <Badge variant="secondary" className={STATUS_TONE[status]}>
                      {STATUS_LABEL[status] ?? status}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Paga hasta</CardDescription>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarCheck2 className="text-muted-foreground size-4" />
                  {provider.data?.paid_until ?? "—"}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Días restantes</CardDescription>
                <CardTitle className="text-base">
                  {days === null ? "—" : days < 0 ? `Vencida hace ${Math.abs(days)} d` : `${days} días`}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Historial */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-4" />
                Historial de pagos
              </CardTitle>
              <CardDescription>
                Movimientos sobre tu suscripción.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {history.isLoading ? (
                <div className="flex h-20 items-center justify-center">
                  <Loader2 className="text-muted-foreground size-5 animate-spin" />
                </div>
              ) : (history.data ?? []).length === 0 ? (
                <p className="text-muted-foreground p-4 text-sm">
                  Sin movimientos registrados.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Monto USD</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Hasta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(history.data ?? []).map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-xs">
                          {formatDate(e.effective_date)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {EVENT_LABEL[e.event_type] ?? e.event_type}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {e.amount_usd ? `$${e.amount_usd}` : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs capitalize">
                          {e.payment_method ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">
                          {e.paid_until_after ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
