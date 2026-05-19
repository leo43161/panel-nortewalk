"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"

import { api, apiErrorMessage } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import type { ApiResponse, Provider, ProviderStatus } from "@/types"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { buttonVariants } from "@/components/ui/button"
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
import { StatusBadge } from "@/components/providers/status-badge"
import { Eye } from "lucide-react"

type ExpiringProvider = Provider & { days_left: number | null }

const RANGES = [
  { value: "3", label: "3 días" },
  { value: "7", label: "7 días" },
  { value: "14", label: "14 días" },
  { value: "30", label: "30 días" },
]

export default function ExpiringPage() {
  const [days, setDays] = React.useState("7")

  const query = useQuery({
    queryKey: ["expiring", days],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ExpiringProvider[]>>(
        "/subscription_expiring",
        { params: { days: Number(days) } }
      )
      return data.data ?? []
    },
  })

  const rows = query.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Por vencer</h1>
          <p className="text-muted-foreground text-sm">
            Proveedores con suscripción o trial que vencen pronto.
          </p>
        </div>
        <div className="grid gap-1">
          <label className="text-muted-foreground text-xs">Ventana</label>
          <Select value={days} onValueChange={(v) => setDays(v ?? "7")}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {query.isError && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo cargar</AlertTitle>
          <AlertDescription>{apiErrorMessage(query.error)}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proveedor</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead>Días restantes</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32">
                  <div className="flex items-center justify-center">
                    <Loader2 className="text-muted-foreground size-5 animate-spin" />
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground h-24 text-center"
                >
                  Nadie vence en los próximos {days} días.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link
                      href={`/providers/${p.id}`}
                      className="font-medium hover:underline"
                    >
                      {p.business_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {p.contact_name} · {p.whatsapp_e164}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={p.status as ProviderStatus} />
                  </TableCell>
                  <TableCell>
                    {formatDate(p.paid_until ?? p.trial_ends_at ?? null)}
                  </TableCell>
                  <TableCell
                    className={
                      Number(p.days_left ?? 0) <= 3
                        ? "font-medium text-red-600"
                        : Number(p.days_left ?? 0) <= 7
                        ? "font-medium text-amber-600"
                        : ""
                    }
                  >
                    {p.days_left != null ? `${Number(p.days_left)} d` : "—"}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/providers/${p.id}`}
                      className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                      title="Ver proveedor"
                    >
                      <Eye className="size-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
