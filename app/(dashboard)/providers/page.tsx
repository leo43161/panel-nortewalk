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
import {
  Building2,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react"

import { api, apiErrorMessage } from "@/lib/api"
import { cn, daysUntil, formatDate } from "@/lib/utils"
import type { ApiResponse, Provider, ProviderStatus } from "@/types"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { StatusBadge } from "@/components/providers/status-badge"

const PAGE_SIZE = 25
const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "active", label: "Activos" },
  { value: "trial", label: "En prueba" },
  { value: "suspended", label: "Suspendidos" },
  { value: "banned", label: "Baneados" },
]

interface ListResponse {
  data: Provider[]
  meta: { total: number }
}

function ProviderAvatarSmall({ provider }: { provider: Provider }) {
  if (provider.logo_url) {
    return (
      <img
        src={provider.logo_url}
        alt={provider.business_name}
        className="size-9 shrink-0 rounded-md border object-cover"
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
    <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md border text-xs font-semibold">
      {initials || <Building2 className="size-4" />}
    </div>
  )
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
      const { data } = await api.get<ApiResponse<Provider[]>>(
        "/provider_list",
        { params }
      )
      return { data: data.data, meta: { total: data.meta?.total ?? 0 } }
    },
  })

  const columns = React.useMemo<ColumnDef<Provider>[]>(
    () => [
      {
        accessorKey: "business_name",
        header: "Proveedor",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <ProviderAvatarSmall provider={row.original} />
            <div className="flex min-w-0 flex-col">
              <Link
                href={`/providers/${row.original.id}`}
                className="truncate font-medium hover:underline"
              >
                {row.original.business_name}
              </Link>
              <span className="text-muted-foreground truncate text-xs">
                {row.original.contact_name} · {row.original.email}
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "city",
        header: "Ciudad",
        cell: ({ row }) => (
          <div className="text-sm">
            <div>{row.original.city}</div>
            <div className="text-muted-foreground text-xs">
              {row.original.province}
            </div>
          </div>
        ),
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
            return <span className="text-muted-foreground text-sm">—</span>
          if (days < 0)
            return (
              <div className="text-sm">
                <div className="text-red-600 font-medium dark:text-red-400">
                  Vencido
                </div>
                <div className="text-muted-foreground text-xs">
                  hace {Math.abs(days)}d
                </div>
              </div>
            )
          if (days <= 7)
            return (
              <div className="text-sm">
                <div className="text-amber-600 font-medium dark:text-amber-400">
                  En {days}d
                </div>
                <div className="text-muted-foreground text-xs">
                  {formatDate(row.original.paid_until)}
                </div>
              </div>
            )
          return (
            <div className="text-sm">
              <div>{formatDate(row.original.paid_until)}</div>
              <div className="text-muted-foreground text-xs">
                en {days}d
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: "total_experiences",
        header: () => <div className="text-right">Exp.</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {Number(row.original.total_experiences ?? 0)}
          </div>
        ),
      },
      {
        accessorKey: "total_leads",
        header: () => <div className="text-right">Leads</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {Number(row.original.total_leads ?? 0)}
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Link
              href={`/providers/${row.original.id}`}
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
              title="Ver detalle"
            >
              <Eye className="size-4" />
            </Link>
            <Link
              href={`/providers/${row.original.id}/edit`}
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
              title="Editar"
            >
              <Pencil className="size-4" />
            </Link>
          </div>
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
  const filtersActive = debouncedSearch !== "" || statusFilter !== "all"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proveedores</h1>
          <p className="text-muted-foreground text-sm">
            {query.isFetching
              ? "Cargando…"
              : `${total} ${total === 1 ? "proveedor" : "proveedores"} en total`}
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
          <SelectTrigger className="w-48">
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
        {filtersActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("")
              setStatusFilter("all")
            }}
          >
            <X className="size-4" />
            Limpiar
          </Button>
        )}
      </div>

      {query.isError && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo cargar la lista</AlertTitle>
          <AlertDescription>{apiErrorMessage(query.error)}</AlertDescription>
        </Alert>
      )}

      <div className="overflow-hidden rounded-md border">
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
                  className="text-muted-foreground h-32 text-center"
                >
                  {filtersActive ? (
                    <>
                      Sin proveedores que coincidan.
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => {
                          setSearch("")
                          setStatusFilter("all")
                        }}
                      >
                        Limpiar filtros
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-3 py-4">
                      <p>Todavía no hay proveedores cargados.</p>
                      <Link
                        href="/providers/new"
                        className={buttonVariants({ size: "sm" })}
                      >
                        <Plus className="size-4" />
                        Crear el primero
                      </Link>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    row.original.status === "suspended" && "bg-red-50/40 dark:bg-red-950/20",
                    row.original.status === "banned" && "opacity-60"
                  )}
                >
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

      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          {total > 0 &&
            `${page * PAGE_SIZE + 1}–${Math.min(
              (page + 1) * PAGE_SIZE,
              total
            )} de ${total}`}
        </p>
        <div className="flex gap-2">
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
    </div>
  )
}
