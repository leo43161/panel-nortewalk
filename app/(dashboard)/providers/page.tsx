"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Eye, Loader2, Plus, Search } from "lucide-react"

import { api, apiErrorMessage } from "@/lib/api"
import { daysUntil, formatDate } from "@/lib/utils"
import type { ApiResponse, Provider, ProviderStatus } from "@/types"

import { Button, buttonVariants } from "@/components/ui/button"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { StatusBadge } from "@/components/providers/status-badge"

const PAGE_SIZE = 25
const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "trial", label: "En prueba" },
  { value: "suspended", label: "Suspendidos" },
  { value: "banned", label: "Baneados" },
]

interface ListResponse {
  data: Provider[]
  meta: { total: number }
}

export default function ProvidersPage() {
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [page, setPage] = React.useState(0)
  const [debouncedSearch, setDebouncedSearch] = React.useState("")

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  React.useEffect(() => {
    setPage(0)
  }, [debouncedSearch, statusFilter])

  const query = useQuery({
    queryKey: ["providers", { debouncedSearch, statusFilter, page }],
    queryFn: async (): Promise<ListResponse> => {
      const params: Record<string, string | number> = {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }
      if (debouncedSearch) params.search = debouncedSearch
      if (statusFilter !== "all") params.status = statusFilter
      const { data } = await api.get<ApiResponse<Provider[]>>("/provider_list", {
        params,
      })
      return { data: data.data, meta: { total: data.meta?.total ?? 0 } }
    },
  })

  const columns = React.useMemo<ColumnDef<Provider>[]>(
    () => [
      {
        accessorKey: "business_name",
        header: "Proveedor",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <Link
              href={`/providers/${row.original.id}`}
              className="font-medium hover:underline"
            >
              {row.original.business_name}
            </Link>
            <span className="text-muted-foreground text-xs">
              {row.original.contact_name} · {row.original.email}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "city",
        header: "Ciudad",
        cell: ({ row }) =>
          `${row.original.city}, ${row.original.province}`,
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <StatusBadge status={row.original.status as ProviderStatus} />
        ),
      },
      {
        accessorKey: "paid_until",
        header: "Vence",
        cell: ({ row }) => {
          const days = daysUntil(row.original.paid_until)
          if (days === null)
            return <span className="text-muted-foreground">—</span>
          if (days < 0)
            return (
              <span className="text-red-600">
                Vencido ({Math.abs(days)}d)
              </span>
            )
          if (days <= 7)
            return <span className="text-amber-600">En {days}d</span>
          return (
            <span>
              {formatDate(row.original.paid_until)}{" "}
              <span className="text-muted-foreground text-xs">
                ({days}d)
              </span>
            </span>
          )
        },
      },
      {
        accessorKey: "total_experiences",
        header: "Exp.",
        cell: ({ row }) => row.original.total_experiences ?? 0,
      },
      {
        accessorKey: "total_leads",
        header: "Leads",
        cell: ({ row }) => row.original.total_leads ?? 0,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Link
            href={`/providers/${row.original.id}`}
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            title="Ver detalle"
          >
            <Eye className="size-4" />
          </Link>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: query.data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const total = query.data?.meta.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proveedores</h1>
          <p className="text-muted-foreground text-sm">
            {query.isFetching ? "Cargando…" : `${total} en total`}
            {totalPages > 1 && ` — página ${page + 1} de ${totalPages}`}
          </p>
        </div>
        <Link href="/providers/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-4" />
          Nuevo proveedor
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nombre, contacto o email…"
            className="pl-8"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v ?? "all")}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isError && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo cargar la lista</AlertTitle>
          <AlertDescription>{apiErrorMessage(query.error)}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32">
                  <div className="flex items-center justify-center">
                    <Loader2 className="text-muted-foreground size-5 animate-spin" />
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground h-24 text-center"
                >
                  Sin proveedores que coincidan.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
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
