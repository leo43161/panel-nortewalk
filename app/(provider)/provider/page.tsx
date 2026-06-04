"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  MessageSquare,
  Users,
} from "lucide-react"

import { api } from "@/lib/api"
import { whatsappLink } from "@/lib/leads"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"
import type {
  ApiResponse,
  Lead,
  Provider,
  ProviderDashboardStats,
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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function isoPlusDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatLongDate(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

export default function ProviderHomePage() {
  const { user } = useAuth()
  const providerId = user?.providerId

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

  // Próximas reservas confirmadas (próximos 14 días)
  const upcoming = useQuery({
    queryKey: ["provider-upcoming", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Lead[]>>("/lead_list", {
        params: {
          status: "confirmed",
          from_date: todayIso(),
          to_date: isoPlusDays(14),
          limit: 50,
        },
      })
      return data.data ?? []
    },
  })

  // Últimos mensajes nuevos
  const newLeads = useQuery({
    queryKey: ["provider-new-leads", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Lead[]>>("/lead_list", {
        params: { status: "new", limit: 5 },
      })
      return data.data ?? []
    },
  })

  const newCount = newLeads.data?.length ?? 0
  const upcomingCount = upcoming.data?.length ?? 0
  const upcomingPax =
    upcoming.data?.reduce((acc, l) => acc + (Number(l.pax) || 0), 0) ?? 0

  const next = upcoming.data?.[0] ?? null
  const daysUntilExpire = stats.data?.days_until_expire ?? null
  const expiringSoon = daysUntilExpire !== null && daysUntilExpire <= 7
  const expired = daysUntilExpire !== null && daysUntilExpire < 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Hola, {provider.data?.business_name ?? "—"}
          </h1>
          <p className="text-muted-foreground text-sm">
            Resumen de tu actividad como guía.
          </p>
        </div>
        <Badge variant="secondary" className="capitalize">
          {provider.data?.status ?? "—"}
        </Badge>
      </div>

      {/* Alertas */}
      {expired && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Suscripción vencida</AlertTitle>
          <AlertDescription>
            Tu cuenta ya no aparece en el sitio público. Contactá al admin para
            regularizar el pago.
          </AlertDescription>
        </Alert>
      )}
      {!expired && expiringSoon && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>Tu suscripción vence en {daysUntilExpire} días</AlertTitle>
          <AlertDescription>
            Renová tu pago para no perder visibilidad en el sitio.
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          icon={<MessageSquare className="size-4" />}
          label="Mensajes nuevos"
          value={newCount}
          href="/provider/leads"
          tone={newCount > 0 ? "amber" : "muted"}
        />
        <KpiCard
          icon={<CalendarClock className="size-4" />}
          label="Próximas reservas"
          value={upcomingCount}
          href="/provider/reservas"
          tone="cyan"
        />
        <KpiCard
          icon={<Users className="size-4" />}
          label="Personas confirmadas"
          value={upcomingPax}
          href="/provider/reservas"
          tone="emerald"
        />
        <KpiCard
          icon={<CreditCard className="size-4" />}
          label="Días para vencer"
          value={daysUntilExpire ?? "—"}
          href="/provider/suscripcion"
          tone={
            expired
              ? "red"
              : expiringSoon
              ? "amber"
              : "muted"
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Próxima excursión */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-4" />
              Próxima excursión confirmada
            </CardTitle>
            <CardDescription>
              La primera con personas confirmadas asistir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.isLoading ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="text-muted-foreground size-5 animate-spin" />
              </div>
            ) : !next ? (
              <p className="text-muted-foreground text-sm">
                No hay reservas confirmadas próximas. Cuando confirmes una desde{" "}
                <Link
                  href="/provider/leads"
                  className="text-foreground underline underline-offset-2"
                >
                  Mensajes
                </Link>
                , va a aparecer acá.
              </p>
            ) : (
              <NextExcursion lead={next} />
            )}
          </CardContent>
        </Card>

        {/* Mensajes nuevos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-4" />
              Mensajes nuevos
            </CardTitle>
            <CardDescription>
              Turistas que pidieron reserva todavía sin contactar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {newLeads.isLoading ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="text-muted-foreground size-5 animate-spin" />
              </div>
            ) : newCount === 0 ? (
              <p className="text-muted-foreground text-sm">
                Sin mensajes nuevos.
              </p>
            ) : (
              newLeads.data?.map((l) => (
                <Link
                  key={l.id}
                  href={`/provider/leads`}
                  className="hover:bg-muted/50 flex flex-col gap-0.5 rounded-md border p-2 text-sm transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{l.tourist_name}</span>
                    <span className="text-muted-foreground text-xs">
                      {l.pax} pax
                    </span>
                  </div>
                  <span className="text-muted-foreground line-clamp-1 text-xs">
                    {l.experience_title} · {l.desired_date}
                  </span>
                </Link>
              ))
            )}
            {newCount > 0 && (
              <Link
                href="/provider/leads"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "w-full"
                )}
              >
                Ver todos
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function NextExcursion({ lead }: { lead: Lead }) {
  const waLink = whatsappLink(lead)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {formatLongDate(lead.desired_date)}
            {lead.desired_time && ` · ${lead.desired_time.slice(0, 5)}`}
          </p>
          <h3 className="text-lg font-semibold leading-tight">
            {lead.experience_title}
          </h3>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Users className="text-muted-foreground size-4" />
          <span className="font-medium">{lead.pax}</span>
          <span className="text-muted-foreground">pax</span>
        </div>
      </div>

      {lead.city && (
        <p className="text-muted-foreground flex items-center gap-1 text-xs">
          <MapPin className="size-3" />
          {lead.city}
        </p>
      )}

      <div className="bg-muted/50 rounded-md p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{lead.tourist_name}</p>
            <p className="text-muted-foreground text-xs">{lead.tourist_phone}</p>
          </div>
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener"
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-green-600 hover:bg-green-700 text-white"
              )}
            >
              <CheckCircle2 className="size-4" />
              WhatsApp
            </a>
          )}
        </div>
        {lead.message && (
          <p className="text-muted-foreground mt-2 line-clamp-3 text-xs italic">
            &ldquo;{lead.message}&rdquo;
          </p>
        )}
      </div>
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  href,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  href?: string
  tone: "amber" | "cyan" | "emerald" | "red" | "muted"
}) {
  const tones: Record<typeof tone, string> = {
    amber: "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30",
    cyan: "border-cyan-200 bg-cyan-50/60 dark:border-cyan-900 dark:bg-cyan-950/30",
    emerald: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30",
    red: "border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30",
    muted: "",
  }
  const body = (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border p-3 transition",
        tones[tone],
        href && "hover:brightness-95"
      )}
    >
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums leading-none">{value}</div>
    </div>
  )
  return href ? <Link href={href}>{body}</Link> : body
}
