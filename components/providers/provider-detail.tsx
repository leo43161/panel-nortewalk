"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ChevronLeft, Loader2 } from "lucide-react"

import { api, apiErrorMessage } from "@/lib/api"
import { formatDate, daysUntil } from "@/lib/utils"
import type {
  ApiResponse,
  Provider,
  ProviderDashboardStats,
  SubscriptionEvent,
} from "@/types"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/providers/status-badge"
import { PayDialog } from "@/components/providers/pay-dialog"
import { StatusActions } from "@/components/providers/status-actions"

export function ProviderDetail({ id }: { id: number }) {
  const providerQ = useQuery({
    queryKey: ["provider", id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Provider>>("/provider_get", {
        params: { id },
      })
      return data.data
    },
  })
  const statsQ = useQuery({
    queryKey: ["provider-stats", id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ProviderDashboardStats>>(
        "/provider_dashboard",
        { params: { id } }
      )
      return data.data
    },
  })
  const historyQ = useQuery({
    queryKey: ["provider-history", id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<SubscriptionEvent[]>>(
        "/subscription_history",
        { params: { provider_id: id, limit: 50, offset: 0 } }
      )
      return data.data
    },
  })

  if (providerQ.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  if (providerQ.isError || !providerQ.data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No se pudo cargar el proveedor</AlertTitle>
        <AlertDescription>
          {apiErrorMessage(providerQ.error, "Proveedor no encontrado")}
        </AlertDescription>
      </Alert>
    )
  }

  const p = providerQ.data
  const stats = statsQ.data
  const events = historyQ.data ?? []
  const days = daysUntil(p.paid_until)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/providers"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ChevronLeft className="size-4" />
          Volver
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{p.business_name}</h1>
            <StatusBadge status={p.status} />
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
            <span>{p.contact_name}</span>
            <a href={`mailto:${p.email}`} className="hover:text-foreground hover:underline">
              {p.email}
            </a>
            {p.whatsapp_e164 && (
              <a
                href={`https://wa.me/${p.whatsapp_e164.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground hover:underline"
              >
                {p.whatsapp_e164}
              </a>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            {p.city}, {p.province} · slug: <code className="bg-muted rounded px-1">{p.slug}</code>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusActions providerId={p.id} current={p.status} />
          <PayDialog providerId={p.id} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Vencimiento</CardDescription>
            <CardTitle className="text-xl">
              {formatDate(p.paid_until)}
            </CardTitle>
          </CardHeader>
          <CardContent
            className={
              days !== null && days < 0
                ? "text-red-600 text-sm"
                : days !== null && days <= 7
                ? "text-amber-600 text-sm"
                : "text-muted-foreground text-sm"
            }
          >
            {days === null
              ? "Sin pagos registrados"
              : days < 0
              ? `Vencido hace ${Math.abs(days)} días`
              : `Quedan ${days} días`}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Leads (total)</CardDescription>
            <CardTitle className="text-xl">{stats?.total_leads ?? "—"}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Últimos 30d: {stats?.leads_last_30d ?? "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Experiencias activas</CardDescription>
            <CardTitle className="text-xl">
              {stats?.active_experiences ?? "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Total: {stats?.total_experiences ?? "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Fee mensual</CardDescription>
            <CardTitle className="text-xl">
              USD {Number(p.monthly_fee_usd).toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Creado: {formatDate(p.created_at)}
          </CardContent>
        </Card>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Historial de suscripción</CardTitle>
          <CardDescription>
            Últimos eventos registrados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyQ.isLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="text-muted-foreground size-5 animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin eventos.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Vence después</TableHead>
                  <TableHead>Por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{formatDate(e.effective_date)}</TableCell>
                    <TableCell>{e.event_type}</TableCell>
                    <TableCell>
                      {e.amount_usd != null
                        ? `USD ${Number(e.amount_usd).toFixed(2)}`
                        : "—"}
                    </TableCell>
                    <TableCell>{e.days_added}</TableCell>
                    <TableCell>{e.payment_method ?? "—"}</TableCell>
                    <TableCell>{formatDate(e.paid_until_after)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {e.created_by ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
