"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ChevronLeft,
  Clock,
  ImageIcon,
  Loader2,
  MapPin,
  Power,
  PowerOff,
  Star,
  Trash2,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { api, apiErrorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import type {
  ApiResponse,
  Experience,
  ExperienceImage,
  Vertical,
} from "@/types"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { GeneralTab } from "@/components/experiences/general-tab"
import { ImagesTab } from "@/components/experiences/images-tab"
import { InclusionsTab } from "@/components/experiences/inclusions-tab"
import { ItineraryTab } from "@/components/experiences/itinerary-tab"
import { SchedulesTab } from "@/components/experiences/schedules-tab"

const VERTICAL_STYLES: Record<Vertical, string> = {
  fwt: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  adventure:
    "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  experience:
    "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  gastronomy: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
}

export function ExperienceEditor({
  id,
  backHref = "/experiences",
  showFeaturedToggle = true,
}: {
  id: number
  /** Link "volver" en el header. Default "/experiences". */
  backHref?: string
  /** Si false, oculta el botón de destacar (uso provider). Default true. */
  showFeaturedToggle?: boolean
}) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ["experience", id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Experience>>(
        "/experience_get",
        { params: { id } }
      )
      return data.data
    },
  })

  const images = useQuery({
    queryKey: ["images", id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ExperienceImage[]>>(
        "/image_list",
        { params: { experience_id: id } }
      )
      return data.data ?? []
    },
    enabled: !!query.data,
  })

  const toggleActive = useMutation({
    mutationFn: async () => {
      await api.post<ApiResponse<unknown>>("/experience_toggle_active", { id })
    },
    onSuccess: () => {
      toast.success("Estado actualizado")
      qc.invalidateQueries({ queryKey: ["experience", id] })
      qc.invalidateQueries({ queryKey: ["experiences"] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const toggleFeatured = useMutation({
    mutationFn: async () => {
      await api.post<ApiResponse<unknown>>("/experience_toggle_featured", {
        id,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["experience", id] })
      qc.invalidateQueries({ queryKey: ["experiences"] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  if (query.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  if (query.isError || !query.data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No se pudo cargar la experiencia</AlertTitle>
        <AlertDescription>
          {apiErrorMessage(query.error, "Experiencia no encontrada")}
        </AlertDescription>
      </Alert>
    )
  }

  const exp = query.data
  const active = Number(exp.is_active) === 1
  const featured = Number(exp.is_featured) === 1
  const cover =
    images.data?.find((i) => Number(i.is_cover) === 1) ?? images.data?.[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={backHref}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ChevronLeft className="size-4" />
          Volver
        </Link>
        <div className="flex gap-1">
          {showFeaturedToggle && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleFeatured.mutate()}
              disabled={toggleFeatured.isPending}
            >
              <Star
                className={cn(
                  "size-4",
                  featured && "fill-amber-400 text-amber-500"
                )}
              />
              {featured ? "Quitar destacada" : "Destacar"}
            </Button>
          )}
          <Button
            variant={active ? "outline" : "default"}
            size="sm"
            onClick={() => toggleActive.mutate()}
            disabled={toggleActive.isPending}
          >
            {active ? (
              <>
                <PowerOff className="size-4 text-red-600" />
                Desactivar
              </>
            ) : (
              <>
                <Power className="size-4" />
                Activar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Header card */}
      <div className="bg-card overflow-hidden rounded-lg border">
        <div className="flex flex-col gap-0 sm:flex-row">
          <div className="relative bg-muted text-muted-foreground flex aspect-video w-full shrink-0 items-center justify-center sm:aspect-auto sm:h-auto sm:w-56">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover.url}
                alt={cover.alt_text ?? exp.title}
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-1 text-xs">
                <ImageIcon className="size-6" />
                Sin portada
              </div>
            )}
          </div>
          <div className="flex-1 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className={cn("capitalize", VERTICAL_STYLES[exp.vertical])}
              >
                {exp.vertical}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {exp.type === "free" ? "Gratis/Gorra" : "Pago"}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {exp.category}
              </Badge>
              {active ? (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300">
                  Activa
                </Badge>
              ) : (
                <Badge variant="secondary">Inactiva</Badge>
              )}
              {featured && (
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300">
                  <Star className="size-3 fill-current" />
                  Destacada
                </Badge>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">
              {exp.title}
            </h1>
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {exp.city}, {exp.province}
              </span>
              <span>
                <Link
                  href={`/providers/${exp.provider_id}`}
                  className="hover:underline"
                >
                  {exp.provider_name ?? `Proveedor #${exp.provider_id}`}
                </Link>
              </span>
              <code className="bg-muted rounded px-1 text-xs">{exp.slug}</code>
            </div>

            {/* KPI strip */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi
                icon={<Clock className="size-4" />}
                label="Duración"
                value={`${exp.duration_min} min`}
              />
              <Kpi
                icon={<Users className="size-4" />}
                label="Pax"
                value={`${exp.min_pax}–${exp.max_pax}`}
              />
              <Kpi
                icon={<ImageIcon className="size-4" />}
                label="Imágenes"
                value={
                  images.isLoading ? "…" : String(images.data?.length ?? 0)
                }
              />
              <Kpi
                icon={<Trash2 className="hidden size-4" />}
                label="Leads"
                value={String(exp.total_leads ?? 0)}
              />
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="images">
            Imágenes
            {images.data && images.data.length > 0 ? (
              <span className="bg-muted text-muted-foreground ml-1.5 rounded px-1.5 text-[10px] font-medium">
                {images.data.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="inclusions">Inclusiones</TabsTrigger>
          <TabsTrigger value="itinerary">Itinerario</TabsTrigger>
          <TabsTrigger value="schedules">Horarios</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="pt-4">
          <GeneralTab experience={exp} />
        </TabsContent>
        <TabsContent value="images" className="pt-4">
          <ImagesTab experienceId={exp.id} />
        </TabsContent>
        <TabsContent value="inclusions" className="pt-4">
          <InclusionsTab experienceId={exp.id} />
        </TabsContent>
        <TabsContent value="itinerary" className="pt-4">
          <ItineraryTab experienceId={exp.id} />
        </TabsContent>
        <TabsContent value="schedules" className="pt-4">
          <SchedulesTab experienceId={exp.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Kpi({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="bg-muted/40 flex items-center gap-2 rounded-md border px-3 py-2">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <div className="text-muted-foreground text-[11px] leading-none">
          {label}
        </div>
        <div className="text-sm font-medium tabular-nums">{value}</div>
      </div>
    </div>
  )
}
