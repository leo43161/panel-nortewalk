"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Eye, Loader2, Power, PowerOff, Search, Star } from "lucide-react"
import { toast } from "sonner"

import { api, apiErrorMessage } from "@/lib/api"
import type { ApiResponse, Experience, Vertical } from "@/types"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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

const PAGE_SIZE = 25

const VERTICALS: { value: string; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "fwt", label: "FWT" },
  { value: "adventure", label: "Aventura" },
  { value: "experience", label: "Experiencias" },
  { value: "gastronomy", label: "Gastronomía" },
]

const ACTIVITY: { value: string; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "1", label: "Activas" },
  { value: "0", label: "Inactivas" },
]

export default function ExperiencesPage() {
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [vertical, setVertical] = React.useState("all")
  const [activity, setActivity] = React.useState("all")
  const [page, setPage] = React.useState(0)
  const qc = useQueryClient()

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  React.useEffect(() => {
    setPage(0)
  }, [debouncedSearch, vertical, activity])

  const query = useQuery({
    queryKey: ["experiences", { debouncedSearch, vertical, activity, page }],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }
      if (debouncedSearch) params.search = debouncedSearch
      if (vertical !== "all") params.vertical = vertical
      if (activity !== "all") params.is_active = activity
      const { data } = await api.get<ApiResponse<Experience[]>>(
        "/experience_list",
        { params }
      )
      return { rows: data.data, total: data.meta?.total ?? 0 }
    },
  })

  const toggleActive = useMutation({
    mutationFn: async (e: Experience) => {
      await api.post<ApiResponse<unknown>>("/experience_toggle_active", {
        id: e.id,
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["experiences"] }),
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const toggleFeatured = useMutation({
    mutationFn: async (e: Experience) => {
      await api.post<ApiResponse<unknown>>("/experience_toggle_featured", {
        id: e.id,
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["experiences"] }),
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const total = query.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rows = query.data?.rows ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Experiencias</h1>
          <p className="text-muted-foreground text-sm">
            {query.isFetching ? "Cargando…" : `${total} en total`}
            {totalPages > 1 && ` — página ${page + 1} de ${totalPages}`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título o slug…"
            className="pl-8"
          />
        </div>
        <Select
          value={vertical}
          onValueChange={(v) => setVertical(v ?? "all")}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VERTICALS.map((v) => (
              <SelectItem key={v.value} value={v.value}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={activity}
          onValueChange={(v) => setActivity(v ?? "all")}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTIVITY.map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {a.label}
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
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Vertical</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Leads</TableHead>
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
                  Sin experiencias.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((e) => {
                const active = Number(e.is_active) === 1
                const featured = Number(e.is_featured) === 1
                return (
                  <TableRow key={e.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {featured ? (
                          <Star className="size-4 fill-amber-400 text-amber-500" />
                        ) : null}
                        <div className="flex flex-col">
                          <Link
                            href={`/experiences/${e.id}`}
                            className="font-medium hover:underline"
                          >
                            {e.title}
                          </Link>
                          <span className="text-muted-foreground text-xs">
                            {e.slug} · {e.city}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/providers/${e.provider_id}`}
                        className="hover:underline"
                      >
                        {e.provider_name ?? `#${e.provider_id}`}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{e.vertical as Vertical}</Badge>
                    </TableCell>
                    <TableCell>{e.type}</TableCell>
                    <TableCell>
                      {e.type === "free"
                        ? "—"
                        : e.price != null
                        ? `${e.currency} ${Number(e.price).toFixed(2)}`
                        : "—"}
                    </TableCell>
                    <TableCell>{e.total_leads ?? 0}</TableCell>
                    <TableCell>
                      {active ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                          Activa
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactiva</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => toggleFeatured.mutate(e)}
                          disabled={toggleFeatured.isPending}
                          title={featured ? "Quitar destacada" : "Marcar destacada"}
                        >
                          <Star
                            className={
                              featured
                                ? "size-4 fill-amber-400 text-amber-500"
                                : "size-4"
                            }
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => toggleActive.mutate(e)}
                          disabled={toggleActive.isPending}
                          title={active ? "Desactivar" : "Activar"}
                        >
                          {active ? (
                            <PowerOff className="size-4 text-red-600" />
                          ) : (
                            <Power className="size-4 text-emerald-600" />
                          )}
                        </Button>
                        <Link
                          href={`/experiences/${e.id}`}
                          className={buttonVariants({
                            variant: "ghost",
                            size: "icon-sm",
                          })}
                          title="Ver / editar"
                        >
                          <Eye className="size-4" />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
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
