"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Eye,
  ImageIcon,
  Loader2,
  MapPin,
  Plus,
  Power,
  PowerOff,
  Search,
  Star,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { api, apiErrorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
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
  { value: "all", label: "Todas las verticales" },
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

const VERTICAL_STYLES: Record<Vertical, string> = {
  fwt: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  adventure: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  experience: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  gastronomy: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
}

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
    onSuccess: () => {
      toast.success("Estado actualizado")
      qc.invalidateQueries({ queryKey: ["experiences"] })
    },
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
  const filtersActive =
    debouncedSearch !== "" || vertical !== "all" || activity !== "all"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Experiencias</h1>
          <p className="text-muted-foreground text-sm">
            {query.isFetching
              ? "Cargando…"
              : `${total} ${total === 1 ? "experiencia" : "experiencias"} en total`}
            {totalPages > 1 && ` — página ${page + 1} de ${totalPages}`}
          </p>
        </div>
        <Link
          href="/experiences/new"
          className={buttonVariants({ size: "sm" })}
        >
          <Plus className="size-4" />
          Nueva experiencia
        </Link>
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
        <Select value={vertical} onValueChange={(v) => setVertical(v ?? "all")}>
          <SelectTrigger className="w-48">
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
        <Select value={activity} onValueChange={(v) => setActivity(v ?? "all")}>
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
        {filtersActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("")
              setVertical("all")
              setActivity("all")
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
            <TableRow>
              <TableHead className="w-[34%]">Experiencia</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Vertical</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32">
                  <div className="flex items-center justify-center">
                    <Loader2 className="text-muted-foreground size-5 animate-spin" />
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground h-32 text-center"
                >
                  {filtersActive ? (
                    <>
                      Sin experiencias que coincidan.
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => {
                          setSearch("")
                          setVertical("all")
                          setActivity("all")
                        }}
                      >
                        Limpiar filtros
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-3 py-4">
                      <p>Todavía no hay experiencias cargadas.</p>
                      <Link
                        href="/experiences/new"
                        className={buttonVariants({ size: "sm" })}
                      >
                        <Plus className="size-4" />
                        Crear la primera
                      </Link>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((e) => {
                const active = Number(e.is_active) === 1
                const featured = Number(e.is_featured) === 1
                return (
                  <TableRow
                    key={e.id}
                    className={cn(
                      !active && "bg-muted/30",
                    )}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border">
                          <ImageIcon className="size-4" />
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <div className="flex items-center gap-1.5">
                            {featured && (
                              <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-500" />
                            )}
                            <Link
                              href={`/experiences/${e.id}`}
                              className="truncate font-medium hover:underline"
                            >
                              {e.title}
                            </Link>
                          </div>
                          <span className="text-muted-foreground flex items-center gap-1 truncate text-xs">
                            <MapPin className="size-3" />
                            {e.city} · <code className="bg-muted/60 rounded px-1 text-[10px]">{e.slug}</code>
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/providers/${e.provider_id}`}
                        className="text-sm hover:underline"
                      >
                        {e.provider_name ?? `#${e.provider_id}`}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "capitalize",
                          VERTICAL_STYLES[e.vertical as Vertical]
                        )}
                      >
                        {e.vertical}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {e.type === "free" ? (
                        <Badge variant="secondary">Gratis</Badge>
                      ) : e.price != null ? (
                        <span className="tabular-nums text-sm">
                          {e.currency} {Number(e.price).toFixed(0)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(e.total_leads ?? 0)}
                    </TableCell>
                    <TableCell>
                      {active ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300">
                          Activa
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactiva</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
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
