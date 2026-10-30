"use client"

import Link from "next/link"
import { useQueries } from "@tanstack/react-query"
import { AlarmClock, ArrowRight, CheckCircle2, MessageSquareWarning } from "lucide-react"

import { api } from "@/lib/api"
import { isoFirstOfMonth, relativeTime } from "@/lib/leads"
import { cn, daysUntil, fullDate, isoDate } from "@/lib/utils"
import type { ApiResponse, Lead, Provider } from "@/types"

import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader, SectionTitle } from "@/components/page"
import { fullName } from "@/components/provider/booking"

const DAY_MS = 86_400_000

export default function DashboardPage() {
  const [active, leadsMonth, fresh, expiring] = useQueries({
    queries: [
      {
        queryKey: ["dashboard", "active"],
        queryFn: async () =>
          (await api.get<ApiResponse<unknown[]>>("/provider_list", { params: { status: "active", limit: 1 } })).data.meta
            ?.total ?? 0,
      },
      {
        queryKey: ["dashboard", "leads-month"],
        queryFn: async () =>
          (await api.get<ApiResponse<unknown[]>>("/lead_list", { params: { from_date: isoFirstOfMonth(), to_date: isoDate(), limit: 1 } }))
            .data.meta?.total ?? 0,
      },
      {
        queryKey: ["dashboard", "stale-leads"],
        // Reservas que un guía no respondió en más de un día: hay que avisarle.
        queryFn: async () => {
          const rows = (await api.get<ApiResponse<Lead[]>>("/lead_list", { params: { status: "new", limit: 100 } })).data.data ?? []
          const cutoff = Date.now() - DAY_MS
          return rows.filter((l) => new Date(l.created_at.replace(" ", "T")).getTime() < cutoff)
        },
      },
      {
        queryKey: ["dashboard", "expiring"],
        queryFn: async () =>
          (await api.get<ApiResponse<Provider[]>>("/subscription_expiring", { params: { days: 14 } })).data.data ?? [],
      },
    ],
  })

  const stale = fresh.data ?? []

  return (
    <>
      <PageHeader title="Resumen" description="Lo que necesita tu atención hoy." />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Proveedores activos" value={active.data} loading={active.isLoading} href="/providers" />
        <Stat label="Reservas este mes" value={leadsMonth.data} loading={leadsMonth.isLoading} href="/leads" />
        <Stat
          label="Sin respuesta hace +24 h"
          value={stale.length}
          loading={fresh.isLoading}
          href="/leads"
          alert={stale.length > 0}
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <SectionTitle title="Reservas sin responder" />
          {fresh.isLoading ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : stale.length === 0 ? (
            <AllGood>Todos los guías respondieron sus reservas del último día.</AllGood>
          ) : (
            <ul className="bg-card divide-y rounded-xl border">
              {stale.slice(0, 8).map((l) => (
                <li key={l.id}>
                  <Link href={`/leads/${l.id}`} className="hover:bg-muted/50 flex items-center gap-3 px-4 py-3 transition-colors">
                    <MessageSquareWarning className="text-highlight size-5 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {fullName(l)} <span className="text-muted-foreground font-normal">→ {l.provider_name}</span>
                      </span>
                      <span className="text-muted-foreground block truncate text-sm">
                        {l.experience_title} · pidió {relativeTime(l.created_at)}
                      </span>
                    </span>
                    <ArrowRight className="text-muted-foreground size-4 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle
            title="Suscripciones por vencer"
            action={
              <Link href="/subscriptions/expiring" className="text-primary text-sm font-medium hover:underline">
                Ver todas
              </Link>
            }
          />
          {expiring.isLoading ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : !expiring.data?.length ? (
            <AllGood>Nadie vence en las próximas dos semanas.</AllGood>
          ) : (
            <ul className="bg-card divide-y rounded-xl border">
              {expiring.data.slice(0, 8).map((p) => {
                const until = p.status === "trial" ? p.trial_ends_at : p.paid_until
                const d = daysUntil(until)
                return (
                  <li key={p.id}>
                    <Link href={`/providers/${p.id}`} className="hover:bg-muted/50 flex items-center gap-3 px-4 py-3 transition-colors">
                      <AlarmClock className={cn("size-5 shrink-0", d !== null && d <= 3 ? "text-destructive" : "text-highlight")} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{p.business_name}</span>
                        <span className="text-muted-foreground block text-sm">
                          {p.status === "trial" ? "Termina la prueba" : "Vence"} el {fullDate(until)}
                          {d !== null && ` · ${d === 0 ? "hoy" : d === 1 ? "mañana" : `en ${d} días`}`}
                        </span>
                      </span>
                      <ArrowRight className="text-muted-foreground size-4 shrink-0" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}

function Stat({
  label,
  value,
  loading,
  href,
  alert,
}: {
  label: string
  value?: number
  loading: boolean
  href: string
  alert?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "bg-card group rounded-xl border p-4 shadow-xs transition hover:shadow-md sm:p-5",
        alert && "border-highlight/40 bg-highlight-soft"
      )}
    >
      <p className={cn("text-sm", alert ? "text-highlight-foreground font-medium" : "text-muted-foreground")}>{label}</p>
      <div className="font-heading mt-1 text-3xl font-semibold tabular-nums">
        {loading ? <Skeleton className="h-9 w-14" /> : Number(value ?? 0)}
      </div>
    </Link>
  )
}

function AllGood({ children }: { children: React.ReactNode }) {
  return (
    <p className="bg-card text-muted-foreground flex items-center gap-2 rounded-xl border px-4 py-5 text-sm">
      <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
      {children}
    </p>
  )
}
