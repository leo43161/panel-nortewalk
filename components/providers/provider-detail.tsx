"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  Building2,
  Calendar,
  ChevronLeft,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  Sparkles,
} from "lucide-react"

import { api, apiErrorMessage } from "@/lib/api"
import { cn, formatDate, daysUntil } from "@/lib/utils"
import type {
  ApiResponse,
  Experience,
  Provider,
  ProviderDashboardStats,
  SubscriptionEvent,
  SubscriptionEventType,
} from "@/types"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
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
import { StatusBadge } from "@/components/providers/status-badge"
import { PayDialog } from "@/components/providers/pay-dialog"
import { StatusActions } from "@/components/providers/status-actions"

const EVENT_LABELS: Record<SubscriptionEventType, string> = {
  payment: "Pago",
  refund: "Reintegro",
  manual_adjustment: "Ajuste",
  suspension: "Suspensión",
  reactivation: "Reactivación",
  trial_start: "Inicio trial",
  trial_end: "Fin trial",
}

const EVENT_BADGE: Record<SubscriptionEventType, string> = {
  payment:
    "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200",
  refund:
    "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-900/40 dark:text-amber-200",
  manual_adjustment: "bg-muted text-foreground ring-border",
  suspension:
    "bg-red-100 text-red-800 ring-red-200 dark:bg-red-900/40 dark:text-red-200",
  reactivation:
    "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200",
  trial_start: "bg-blue-100 text-blue-800 ring-blue-200",
  trial_end: "bg-zinc-200 text-zinc-700 ring-zinc-300",
}

const METHOD_LABELS: Record<string, string> = {
  transfer: "Transferencia",
  cash: "Efectivo",
  mercadopago: "MercadoPago",
  crypto: "Cripto",
  other: "Otro",
}

function ProviderAvatar({ provider }: { provider: Provider }) {
  if (provider.logo_url) {
    return (
      <img
        src={provider.logo_url}
        alt={provider.business_name}
        className="size-14 shrink-0 rounded-lg border object-cover"
      />
    )
  }
  const initials = provider.business_name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase()
  return (
    <div className="bg-muted text-muted-foreground flex size-14 shrink-0 items-center justify-center rounded-lg border text-lg font-semibold">
      {initials || <Building2 className="size-6" />}
    </div>
  )
}

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
  const experiencesQ = useQuery({
    queryKey: ["provider-experiences", id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Experience[]>>(
        "/experience_list",
        { params: { provider_id: id, limit: 100, offset: 0 } }
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
      <div className="space-y-4">
        <Link
          href="/providers"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ChevronLeft className="size-4" />
          Volver
        </Link>
        <Alert variant="destructive">
          <AlertTitle>No se pudo cargar el proveedor</AlertTitle>
          <AlertDescription>
            {apiErrorMessage(providerQ.error, "Proveedor no encontrado")}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const p = providerQ.data
  const stats = statsQ.data
  const events = historyQ.data ?? []
  const experiences = experiencesQ.data ?? []
  const days = daysUntil(p.paid_until)
  const trialDays = daysUntil(p.trial_ends_at)
  const waNumber = p.whatsapp_e164?.replace(/\D/g, "")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/providers"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ChevronLeft className="size-4" />
          Volver a proveedores
        </Link>
        <Link
          href={`/providers/${p.id}/edit`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Pencil className="size-4" />
          Editar
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <ProviderAvatar provider={p} />
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {p.business_name}
              </h1>
              <StatusBadge status={p.status} />
            </div>
            <p className="text-muted-foreground text-sm">
              {p.contact_name}
              <span className="mx-1.5">·</span>
              <span className="text-xs">
                slug:{" "}
                <code className="bg-muted rounded px-1 py-0.5">{p.slug}</code>
              </span>
            </p>
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <a
                href={`mailto:${p.email}`}
                className="hover:text-foreground inline-flex items-center gap-1.5 hover:underline"
              >
                <Mail className="size-3.5" />
                {p.email}
              </a>
              {waNumber && (
                <a
                  href={`https://wa.me/${waNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground inline-flex items-center gap-1.5 hover:underline"
                >
                  <Phone className="size-3.5" />
                  {p.whatsapp_e164}
                  <ExternalLink className="size-3" />
                </a>
              )}
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                {p.city}, {p.province}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusActions providerId={p.id} current={p.status} />
          <PayDialog
            providerId={p.id}
            paidUntil={p.paid_until}
            monthlyFeeUsd={p.monthly_fee_usd}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              Vencimiento
            </CardDescription>
            <CardTitle className="text-xl">
              {formatDate(p.paid_until)}
            </CardTitle>
          </CardHeader>
          <CardContent
            className={cn(
              "text-sm",
              days === null
                ? "text-muted-foreground"
                : days < 0
                ? "text-red-600 dark:text-red-400"
                : days <= 7
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
            )}
          >
            {days === null
              ? "Sin pagos registrados"
              : days < 0
              ? `Vencido hace ${Math.abs(days)} días`
              : `Quedan ${days} días`}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <MessageSquare className="size-3.5" />
              Leads totales
            </CardDescription>
            <CardTitle className="text-xl">
              {statsQ.isLoading ? "…" : Number(stats?.total_leads ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Últimos 30d: {Number(stats?.leads_last_30d ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Sparkles className="size-3.5" />
              Experiencias
            </CardDescription>
            <CardTitle className="text-xl">
              {statsQ.isLoading
                ? "…"
                : Number(stats?.active_experiences ?? 0)}{" "}
              <span className="text-muted-foreground text-sm font-normal">
                / {Number(stats?.total_experiences ?? 0)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Activas / total
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Fee mensual</CardDescription>
            <CardTitle className="text-xl">
              USD {Number(p.monthly_fee_usd).toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Cliente desde {formatDate(p.created_at)}
          </CardContent>
        </Card>
      </div>

      {p.status === "trial" && p.trial_ends_at && (
        <Alert
          className={cn(
            trialDays !== null && trialDays < 0
              ? "border-red-300 bg-red-50 dark:bg-red-950/30"
              : "border-amber-300 bg-amber-50 dark:bg-amber-950/30"
          )}
        >
          <AlertTitle>
            {trialDays !== null && trialDays < 0
              ? "Trial vencido"
              : "En período de prueba"}
          </AlertTitle>
          <AlertDescription>
            Trial {trialDays !== null && trialDays < 0 ? "venció" : "vence"} el{" "}
            {formatDate(p.trial_ends_at)}
            {trialDays !== null &&
              ` (${trialDays < 0 ? `hace ${Math.abs(trialDays)}` : `en ${trialDays}`} días)`}
            .
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acerca de</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {p.bio ? (
              <p className="whitespace-pre-wrap">{p.bio}</p>
            ) : (
              <p className="text-muted-foreground italic">
                Sin descripción.{" "}
                <Link
                  href={`/providers/${p.id}/edit`}
                  className="text-primary hover:underline"
                >
                  Agregar
                </Link>
                .
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-base">
              <FileText className="size-4" />
              Notas internas
            </CardTitle>
            <CardDescription>No visibles para el proveedor</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {p.notes_admin ? (
              <p className="whitespace-pre-wrap">{p.notes_admin}</p>
            ) : (
              <p className="text-muted-foreground italic">Sin notas.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Experiencias</CardTitle>
            <CardDescription>
              {experiencesQ.isLoading
                ? "Cargando…"
                : `${experiences.length} en total`}
            </CardDescription>
          </div>
          <Link
            href={`/experiences?provider_id=${p.id}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Ver todas
          </Link>
        </CardHeader>
        <CardContent>
          {experiencesQ.isLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="text-muted-foreground size-5 animate-spin" />
            </div>
          ) : experiences.length === 0 ? (
            <div className="text-muted-foreground py-6 text-center text-sm">
              <p>Este proveedor todavía no tiene experiencias cargadas.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Vertical</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {experiences.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Link
                        href={`/experiences/${e.id}`}
                        className="font-medium hover:underline"
                      >
                        {e.title}
                      </Link>
                      <div className="text-muted-foreground text-xs">
                        {e.slug}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{e.vertical}</TableCell>
                    <TableCell className="capitalize">{e.type}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(e.total_leads ?? 0)}
                    </TableCell>
                    <TableCell>
                      {Number(e.is_active) === 1 ? (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200"
                        >
                          Activa
                        </Badge>
                      ) : (
                        <Badge variant="outline">Inactiva</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/experiences/${e.id}`}
                        className={buttonVariants({
                          variant: "ghost",
                          size: "icon-sm",
                        })}
                        title="Ver detalle"
                      >
                        <Eye className="size-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de suscripción</CardTitle>
          <CardDescription>
            Pagos, suspensiones y cambios de estado. Últimos {events.length}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyQ.isLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="text-muted-foreground size-5 animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Sin eventos registrados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Días</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Vence después</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Admin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(e.effective_date)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "ring-1 ring-inset",
                          EVENT_BADGE[e.event_type]
                        )}
                      >
                        {EVENT_LABELS[e.event_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {e.amount_usd != null
                        ? `USD ${Number(e.amount_usd).toFixed(2)}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(e.days_added) || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {e.payment_method
                        ? METHOD_LABELS[e.payment_method] ?? e.payment_method
                        : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(e.paid_until_after)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {e.reference || "—"}
                      {e.notes && (
                        <div
                          className="truncate text-[11px] italic"
                          title={e.notes}
                        >
                          {e.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {e.created_by || "—"}
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
