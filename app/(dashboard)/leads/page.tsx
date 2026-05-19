"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { api, apiErrorMessage } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import type { ApiResponse, Lead, LeadStatus } from "@/types"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  LeadStatusBadge,
  LEAD_STATUS_LABELS,
} from "@/components/leads/status-badge"

const PAGE_SIZE = 50

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  ...Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
]

export default function LeadsPage() {
  const [status, setStatus] = React.useState("all")
  const [fromDate, setFromDate] = React.useState("")
  const [toDate, setToDate] = React.useState("")
  const [page, setPage] = React.useState(0)
  const qc = useQueryClient()

  React.useEffect(() => {
    setPage(0)
  }, [status, fromDate, toDate])

  const query = useQuery({
    queryKey: ["leads", { status, fromDate, toDate, page }],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }
      if (status !== "all") params.status = status
      if (fromDate) params.from_date = fromDate
      if (toDate) params.to_date = toDate
      const { data } = await api.get<ApiResponse<Lead[]>>("/lead_list", {
        params,
      })
      return { rows: data.data, total: data.meta?.total ?? 0 }
    },
  })

  const updateStatus = useMutation({
    mutationFn: async (input: { id: number; status: LeadStatus }) => {
      await api.post<ApiResponse<unknown>>("/lead_update_status", input)
    },
    onSuccess: () => {
      toast.success("Estado actualizado")
      qc.invalidateQueries({ queryKey: ["leads"] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const total = query.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rows = query.data?.rows ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
        <p className="text-muted-foreground text-sm">
          {query.isFetching ? "Cargando…" : `${total} en total`}
          {totalPages > 1 && ` — página ${page + 1} de ${totalPages}`}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1">
          <label className="text-muted-foreground text-xs">Estado</label>
          <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <label className="text-muted-foreground text-xs">Desde</label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="grid gap-1">
          <label className="text-muted-foreground text-xs">Hasta</label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-44"
          />
        </div>
        {(fromDate || toDate || status !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatus("all")
              setFromDate("")
              setToDate("")
            }}
          >
            Limpiar
          </Button>
        )}
      </div>

      {query.isError && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo cargar leads</AlertTitle>
          <AlertDescription>{apiErrorMessage(query.error)}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Turista</TableHead>
              <TableHead>Experiencia</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Fecha deseada</TableHead>
              <TableHead>Pax</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32">
                  <div className="flex items-center justify-center">
                    <Loader2 className="text-muted-foreground size-5 animate-spin" />
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-muted-foreground h-24 text-center"
                >
                  Sin leads.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDate(l.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{l.tourist_name}</span>
                      <span className="text-muted-foreground text-xs">
                        {l.tourist_phone}
                        {l.tourist_email ? ` · ${l.tourist_email}` : ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {l.experience_title ?? `#${l.experience_id}`}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/providers/${l.provider_id}`}
                      className="hover:underline"
                    >
                      {l.provider_name ?? `#${l.provider_id}`}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {formatDate(l.desired_date)}
                    {l.desired_time ? ` ${l.desired_time.slice(0, 5)}` : ""}
                  </TableCell>
                  <TableCell>{l.pax}</TableCell>
                  <TableCell>
                    <LeadStatusBadge status={l.status} />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={l.status}
                      onValueChange={(v) =>
                        v &&
                        v !== l.status &&
                        updateStatus.mutate({
                          id: l.id,
                          status: v as LeadStatus,
                        })
                      }
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LEAD_STATUS_LABELS).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0 || query.isFetching}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages - 1 || query.isFetching}
          onClick={() => setPage((p) => p + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}
