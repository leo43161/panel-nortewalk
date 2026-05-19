"use client"

import Link from "next/link"
import { useQueries } from "@tanstack/react-query"
import { AlarmClock, ArrowRight, MessageSquare, Users } from "lucide-react"

import { api } from "@/lib/api"
import type { ApiResponse, Provider } from "@/types"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function monthStart(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}-01`
}

export default function DashboardPage() {
  const results = useQueries({
    queries: [
      {
        queryKey: ["dashboard", "active-count"],
        queryFn: async () => {
          const { data } = await api.get<ApiResponse<unknown[]>>(
            "/provider_list",
            { params: { status: "active", limit: 1 } }
          )
          return data.meta?.total ?? 0
        },
      },
      {
        queryKey: ["dashboard", "expiring"],
        queryFn: async () => {
          const { data } = await api.get<ApiResponse<Provider[]>>(
            "/subscription_expiring",
            { params: { days: 7 } }
          )
          return data.data ?? []
        },
      },
      {
        queryKey: ["dashboard", "leads-month"],
        queryFn: async () => {
          const { data } = await api.get<ApiResponse<unknown[]>>(
            "/lead_list",
            { params: { from_date: monthStart(), limit: 1 } }
          )
          return data.meta?.total ?? 0
        },
      },
    ],
  })

  const [activeCount, expiring, leadsMonth] = results
  const expiringCount = expiring.data?.length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Resumen general del sistema</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Users className="size-5" />}
          iconBg="bg-primary/10 text-primary"
          label="Proveedores activos"
          loading={activeCount.isLoading}
          value={activeCount.data ?? 0}
          href="/providers"
        />
        <StatCard
          icon={<AlarmClock className="size-5" />}
          iconBg={
            expiringCount > 0
              ? "bg-accent/15 text-accent"
              : "bg-muted text-muted-foreground"
          }
          label="Vencen en 7 días"
          loading={expiring.isLoading}
          value={expiringCount}
          href="/subscriptions/expiring"
          accent={expiringCount > 0 ? "amber" : undefined}
        />
        <StatCard
          icon={<MessageSquare className="size-5" />}
          iconBg="bg-secondary text-secondary-foreground"
          label="Leads del mes"
          loading={leadsMonth.isLoading}
          value={leadsMonth.data ?? 0}
          href="/leads"
        />
      </div>

      {expiringCount > 0 && (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-accent flex items-center gap-2 text-base">
              <AlarmClock className="size-4" />
              Proveedores próximos a vencer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {(expiring.data ?? []).slice(0, 6).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between border-b py-2 text-sm last:border-0"
              >
                <Link
                  href={`/providers/${p.id}`}
                  className="font-medium hover:underline"
                >
                  {p.business_name}
                </Link>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {p.paid_until}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
  loading,
  href,
  accent,
}: {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: number
  loading: boolean
  href: string
  accent?: "amber"
}) {
  return (
    <Link href={href} className="group">
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className={cn("flex size-9 items-center justify-center rounded-lg", iconBg)}>
              {icon}
            </div>
            <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div
            className={cn(
              "text-3xl font-bold tabular-nums",
              accent === "amber" && "text-accent"
            )}
          >
            {loading ? <Skeleton className="h-9 w-14" /> : value}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">{label}</p>
        </CardContent>
      </Card>
    </Link>
  )
}
