"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ImageIcon, Loader2, Plus, Search, Star, X } from "lucide-react"
import { toast } from "sonner"

import { api, apiErrorMessage } from "@/lib/api"
import { VERTICALS, VERTICAL_LABEL, cityLabel } from "@/lib/labels"
import { cn } from "@/lib/utils"
import type { ApiResponse, Experience } from "@/types"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { PageHeader } from "@/components/page"
import { experienceGaps } from "@/components/experiences/readiness"
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

const TYPE_FILTER = [
  { value: "all", label: "Todos los tipos" },
  ...VERTICALS.map((v) => ({ value: v.value, label: v.label })),
]

const ACTIVITY: { value: string; label: string }[] = [
  { value: "all", label: "Visibles y ocultas" },
  { value: "1", label: "Visibles" },
  { value: "0", label: "Ocultas" },
]

export default function ExperiencesPage() {
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [vertical, setVertical] = React.useState("all")
  const [activity, setActivity] = React.useState("all")
  const [page, setPage] = React.useState(0)
  const qc = useQueryClient()

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(0)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

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
      toast.success("Listo")
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
    <>
      <PageHeader
        title="Experiencias"
        description={query.isLoading ? "Cargando…" : `${total} ${total === 1 ? "experiencia" : "experiencias"} de todos los proveedores.`}
        actions={
          <Link href="/experiences/new" className={buttonVariants()}>
            <Plus />
            Nueva experiencia
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título…"
            aria-label="Buscar experiencias"
            className="pl-9"
          />
        </div>
        <Select
          value={vertical}
          onValueChange={(v) => {
            setVertical(v ?? "all")
            setPage(0)
          }}
        >
          <SelectTrigger className="w-full sm:w-48" aria-label="Tipo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTER.map((v) => (
              <SelectItem key={v.value} value={v.value}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={activity}
          onValueChange={(v) => {
            setActivity(v ?? "all")
            setPage(0)
          }}
        >
          <SelectTrigger className="w-full sm:w-44" aria-label="Visibilidad">
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

      <div className="bg-card overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Experiencia</TableHead>
              <TableHead className="hidden lg:table-cell">Proveedor</TableHead>
              <TableHead className="hidden xl:table-cell">Precio</TableHead>
              <TableHead className="text-right">Reservas</TableHead>
              <TableHead>Visible</TableHead>
              <TableHead className="w-0 pr-4">
                <span className="sr-only">Destacar</span>
              </TableHead>
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
                const gaps = experienceGaps(e)
                return (
                  <TableRow
                    key={e.id}
                    className={cn(!active && "bg-muted/30")}
                  >
                    <TableCell className="max-w-96 pl-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border">
                          {e.cover_image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={e.cover_image} alt="" className="size-full object-cover" />
                          ) : (
                            <ImageIcon className="size-4" />
                          )}
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
                          <span className="text-muted-foreground truncate text-sm">
                            {VERTICAL_LABEL[e.vertical]} · {cityLabel(e.city)}
                            <span className="lg:hidden"> · {e.provider_name}</span>
                          </span>
                          {gaps.length > 0 && (
                            <span className="text-highlight-foreground truncate text-sm">
                              Le falta: {gaps.join(", ").toLowerCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Link href={`/providers/${e.provider_id}`} className="hover:underline">
                        {e.provider_name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap xl:table-cell">
                      {e.type === "free" ? (
                        <span className="text-muted-foreground">A la gorra</span>
                      ) : e.price != null ? (
                        <span className="tabular-nums text-sm">
                          {e.currency === "USD" ? "US$" : "$"}{" "}
                          {Number(e.price).toLocaleString("es-AR")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(e.total_leads ?? 0)}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={active}
                        disabled={toggleActive.isPending}
                        onCheckedChange={() => toggleActive.mutate(e)}
                        aria-label={active ? `Ocultar “${e.title}” del sitio` : `Mostrar “${e.title}” en el sitio`}
                      />
                    </TableCell>
                    <TableCell className="pr-4">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => toggleFeatured.mutate(e)}
                        disabled={toggleFeatured.isPending}
                        aria-pressed={featured}
                        aria-label={featured ? "Quitar de destacadas" : "Destacar en la portada"}
                        title={featured ? "Quitar de destacadas" : "Destacar en la portada"}
                      >
                        <Star className={featured ? "fill-amber-400 text-amber-500" : "text-muted-foreground"} />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm tabular-nums">
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
      )}
    </>
  )
}
