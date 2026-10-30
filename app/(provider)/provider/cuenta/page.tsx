"use client"

import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, CalendarCheck2, CheckCircle2, LogOut } from "lucide-react"

import { api, apiErrorMessage } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { cityLabel } from "@/lib/labels"
import { cn, formatDate, fullDate } from "@/lib/utils"
import type { ApiResponse, Provider, ProviderDashboardStats, SubscriptionEvent } from "@/types"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ChangePasswordCard } from "@/components/dashboard/change-password-card"
import { PageHeader, SectionTitle } from "@/components/page"

const usd = (v: number | string) =>
  Number(v).toLocaleString("es-AR", { style: "currency", currency: "USD", currencyDisplay: "code" }).replace("USD", "US$")

const EVENT_LABEL: Record<string, string> = {
  payment: "Pago",
  refund: "Devolución",
  manual_adjustment: "Ajuste",
  suspension: "Suspensión",
  reactivation: "Reactivación",
  trial_start: "Inicio de la prueba",
  trial_end: "Fin de la prueba",
}

const METHOD_LABEL: Record<string, string> = {
  transfer: "Transferencia",
  cash: "Efectivo",
  mercadopago: "Mercado Pago",
  crypto: "Cripto",
  other: "Otro",
}

export default function CuentaPage() {
  const { user, logout } = useAuth()
  const providerId = user?.providerId

  const provider = useQuery({
    queryKey: ["provider", providerId],
    enabled: !!providerId,
    queryFn: async () =>
      (await api.get<ApiResponse<Provider>>("/provider_get", { params: { id: providerId } })).data.data,
  })
  const stats = useQuery({
    queryKey: ["provider-dashboard", providerId],
    enabled: !!providerId,
    queryFn: async () =>
      (await api.get<ApiResponse<ProviderDashboardStats>>("/provider_dashboard", { params: { id: providerId } })).data
        .data,
  })
  const history = useQuery({
    queryKey: ["provider-sub-history", providerId],
    enabled: !!providerId,
    queryFn: async () =>
      (
        await api.get<ApiResponse<SubscriptionEvent[]>>("/subscription_history", {
          params: { provider_id: providerId, limit: 20 },
        })
      ).data.data ?? [],
  })

  const p = provider.data
  const days = stats.data?.days_until_expire == null ? null : Number(stats.data.days_until_expire)

  return (
    <div className="max-w-3xl">
      <PageHeader title="Mi cuenta" description="Tu suscripción, tus datos y tu contraseña." />

      <section className="mb-8">
        <SectionTitle title="Suscripción" />
        {provider.isLoading || stats.isLoading ? (
          <Skeleton className="h-28 rounded-xl" />
        ) : provider.isError || !p ? (
          <Alert variant="destructive">
            <AlertDescription>{apiErrorMessage(provider.error)}</AlertDescription>
          </Alert>
        ) : (
          <SubscriptionCard provider={p} days={days} />
        )}

        {!!history.data?.length && (
          <div className="bg-card mt-3 rounded-xl border">
            <p className="text-muted-foreground border-b px-4 py-2.5 text-sm font-medium">Movimientos</p>
            <ul className="divide-y">
              {history.data.map((e) => (
                <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-3 text-sm">
                  <span>
                    <span className="font-medium">{EVENT_LABEL[e.event_type] ?? e.event_type}</span>
                    {e.payment_method && <span className="text-muted-foreground"> · {METHOD_LABEL[e.payment_method]}</span>}
                    {e.paid_until_after && (
                      <span className="text-muted-foreground"> · hasta el {formatDate(e.paid_until_after)}</span>
                    )}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {e.amount_usd ? `${usd(e.amount_usd)} · ` : ""}
                    {formatDate(e.effective_date)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mb-8">
        <SectionTitle title="Tus datos" />
        <div className="bg-card rounded-xl border">
          <dl className="grid gap-x-6 gap-y-4 p-4 sm:grid-cols-2 sm:p-5">
            <Field label="Nombre en el sitio" value={p?.business_name} />
            <Field label="Responsable" value={p?.contact_name} />
            <Field label="Email (para entrar al panel)" value={p?.email ?? user?.email} />
            <Field label="WhatsApp donde te escriben" value={p?.whatsapp_e164} />
            <Field label="Ciudad" value={p ? `${cityLabel(p.city)}, ${p.province}` : undefined} />
          </dl>
          <p className="text-muted-foreground border-t px-4 py-3 text-sm sm:px-5">
            ¿Cambió algún dato? Avisale al equipo de Norte Walk y lo actualizamos.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <ChangePasswordCard />
      </section>

      <Button variant="outline" size="lg" onClick={logout} className="w-full sm:w-auto">
        <LogOut />
        Cerrar sesión
      </Button>
    </div>
  )
}

function SubscriptionCard({ provider: p, days }: { provider: Provider; days: number | null }) {
  const blocked = p.status === "suspended" || p.status === "banned" || (days !== null && days < 0)
  const soon = !blocked && days !== null && days <= 15
  const until = p.status === "trial" ? p.trial_ends_at : p.paid_until

  const tone = blocked
    ? "border-destructive/30 bg-destructive/5"
    : soon
      ? "border-highlight/40 bg-highlight-soft"
      : "bg-card"
  const Icon = blocked || soon ? AlertTriangle : CheckCircle2

  return (
    <div className={cn("flex gap-4 rounded-xl border p-4 sm:p-5", tone)}>
      <Icon
        className={cn(
          "mt-0.5 size-6 shrink-0",
          blocked ? "text-destructive" : soon ? "text-highlight-foreground" : "text-emerald-600"
        )}
      />
      <div className="space-y-1">
        <p className="text-lg font-semibold">
          {blocked
            ? "Tu cuenta está pausada"
            : p.status === "trial"
              ? "Estás en el período de prueba"
              : "Tu suscripción está al día"}
        </p>
        <p className="text-muted-foreground text-[0.9375rem]">
          {blocked ? (
            "Tus experiencias no se ven en el sitio. Avisale al equipo de Norte Walk para reactivarla."
          ) : until ? (
            <>
              {p.status === "trial" ? "La prueba termina" : "Vence"} el{" "}
              <span className="text-foreground font-medium">{fullDate(until)}</span>
              {days !== null && ` (en ${days} ${days === 1 ? "día" : "días"})`}.
              {soon && " Renová a tiempo para no dejar de aparecer en el sitio."}
            </>
          ) : (
            "Sin fecha de vencimiento cargada."
          )}
        </p>
        {!blocked && Number(p.monthly_fee_usd) > 0 && (
          <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <CalendarCheck2 className="size-4" />
            Cuota mensual: {usd(p.monthly_fee_usd)}
          </p>
        )}
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="mt-0.5 truncate font-medium">{value || "—"}</dd>
    </div>
  )
}
