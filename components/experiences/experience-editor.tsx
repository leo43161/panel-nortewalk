"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  CheckCircle2,
  ChevronLeft,
  Circle,
  Clock,
  ImagePlus,
  Loader2,
  MapPin,
  Save,
  Star,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { api, apiErrorMessage } from "@/lib/api"
import { VERTICAL_LABEL, cityLabel } from "@/lib/labels"
import { cn, formatDuration } from "@/lib/utils"
import type { ApiResponse, Experience } from "@/types"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExperienceForm } from "@/components/experiences/experience-form"
import { ImagesTab } from "@/components/experiences/images-tab"
import { InclusionsTab } from "@/components/experiences/inclusions-tab"
import { ItineraryTab } from "@/components/experiences/itinerary-tab"
import { SchedulesTab } from "@/components/experiences/schedules-tab"
import { TranslationsTab } from "@/components/experiences/translations-tab"
import {
  useImages,
  useInclusions,
  useItinerary,
  useSchedules,
} from "@/components/experiences/queries"
import { readiness } from "@/components/experiences/readiness"

type TabKey =
  | "info"
  | "photos"
  | "inclusions"
  | "route"
  | "schedules"
  | "translations"
  | "reviews"

export function ExperienceEditor({
  id,
  backHref = "/experiences",
  isAdmin = true,
}: {
  id: number
  /** Link "Volver". */
  backHref?: string
  /** Admin ve "Destacada" y "Reseñas"; el guía no. */
  isAdmin?: boolean
}) {
  const qc = useQueryClient()
  const [tab, setTab] = React.useState<TabKey>("info")

  const query = useQuery({
    queryKey: ["experience", id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Experience>>("/experience_get", {
        params: { id },
      })
      // MySQL manda "1": con id string las queryKeys de las pestañas no coinciden con las del editor.
      return { ...data.data, id: Number(data.data.id), provider_id: Number(data.data.provider_id) }
    },
  })
  const images = useImages(id)
  const inclusions = useInclusions(id)
  const itinerary = useItinerary(id)
  const schedules = useSchedules(id)

  const refreshExperience = () => {
    qc.invalidateQueries({ queryKey: ["experience", id] })
    qc.invalidateQueries({ queryKey: ["experiences"] })
  }
  const toggleActive = useMutation({
    mutationFn: () => api.post("/experience_toggle_active", { id }),
    onSuccess: refreshExperience,
    onError: (err) => toast.error(apiErrorMessage(err)),
  })
  const toggleFeatured = useMutation({
    mutationFn: () => api.post("/experience_toggle_featured", { id }),
    onSuccess: refreshExperience,
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
        <AlertTitle>No se pudo abrir la experiencia</AlertTitle>
        <AlertDescription>
          {apiErrorMessage(query.error, "Experiencia no encontrada")}
        </AlertDescription>
      </Alert>
    )
  }

  const exp = query.data
  const active = Number(exp.is_active) === 1
  const featured = Number(exp.is_featured) === 1
  const cover = images.data?.find((i) => i.is_cover === 1) ?? images.data?.[0]
  const count = {
    photos: images.data?.length ?? 0,
    inclusions: inclusions.data?.length ?? 0,
    route: itinerary.data?.length ?? 0,
    schedules: schedules.data?.length ?? 0,
  }

  const checklist = readiness(exp, {
    photos: count.photos,
    inclusions: count.inclusions,
    schedules: count.schedules,
    route: count.route,
  })
  const missing = checklist.filter((c) => !c.done && !c.optional)
  const ready = missing.length === 0
  // Lo opcional nunca se marca como faltante.
  const tabDone = (t: TabKey) => {
    const c = checklist.find((i) => i.key === t)
    return c && (c.done || c.optional)
  }

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="text-muted-foreground hover:text-foreground -ml-1 inline-flex h-8 items-center gap-1 rounded-md px-1 text-sm font-medium"
      >
        <ChevronLeft className="size-4" />
        Experiencias
      </Link>

      <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
        <div className="flex flex-col sm:flex-row">
          <button
            type="button"
            onClick={() => setTab("photos")}
            aria-label={cover ? "Ver fotos" : "Subir fotos"}
            className="bg-muted text-muted-foreground relative flex aspect-video w-full shrink-0 items-center justify-center sm:aspect-auto sm:w-72"
          >
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover.url} alt={cover.alt_text ?? exp.title} className="absolute inset-0 size-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-sm">
                <ImagePlus className="size-6" />
                Subir fotos
              </span>
            )}
          </button>
          <div className="flex-1 space-y-3 p-4 sm:p-6">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {VERTICAL_LABEL[exp.vertical]} · {exp.category} · {exp.type === "free" ? "A la gorra" : "Precio fijo"}
            </p>
            <h1 className="text-2xl leading-tight font-semibold tracking-tight md:text-[1.75rem]">{exp.title}</h1>
            <p className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {cityLabel(exp.city)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {formatDuration(exp.duration_min)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="size-3.5" />
                hasta {exp.max_pax} personas
              </span>
              {isAdmin && (
                <Link href={`/providers/${exp.provider_id}`} className="hover:text-foreground underline-offset-2 hover:underline">
                  {exp.provider_name ?? "Ver proveedor"}
                </Link>
              )}
            </p>

            <div className="flex flex-wrap gap-x-8 gap-y-3 border-t pt-4">
              <label className="flex cursor-pointer items-center gap-3">
                <Switch checked={active} disabled={toggleActive.isPending} onCheckedChange={() => toggleActive.mutate()} />
                <span>
                  <span className={cn("block text-sm font-medium", active && "text-emerald-700 dark:text-emerald-400")}>
                    {active ? "Visible en el sitio" : "Oculta"}
                  </span>
                  <span className="text-muted-foreground block text-sm">
                    {active ? "Los turistas la ven y pueden reservar." : "Nadie la ve hasta que la actives."}
                  </span>
                </span>
              </label>
              {isAdmin && (
                <label className="flex cursor-pointer items-center gap-3">
                  <Switch checked={featured} disabled={toggleFeatured.isPending} onCheckedChange={() => toggleFeatured.mutate()} />
                  <span>
                    <span className="flex items-center gap-1 text-sm font-medium">
                      <Star className={cn("size-3.5", featured && "fill-amber-400 text-amber-500")} />
                      Destacada
                    </span>
                    <span className="text-muted-foreground block text-sm">Aparece primero en la portada.</span>
                  </span>
                </label>
              )}
            </div>
          </div>
        </div>

        {(!ready || !active) && (
          <div className={cn("border-t px-4 py-3 sm:px-6", ready ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-highlight-soft")}>
            {ready ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span className="flex-1 font-medium">Está completa. Activala para que aparezca en el sitio.</span>
                <Button size="sm" onClick={() => toggleActive.mutate()} disabled={toggleActive.isPending}>
                  Publicar ahora
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-highlight-foreground font-medium">{active ? "Para que quede completa te falta:" : "Para publicarla te falta:"}</span>
                {missing.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setTab(c.key)}
                    className="bg-card hover:border-highlight inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-medium transition-colors pointer-coarse:h-9"
                  >
                    <Circle className="text-highlight size-3.5" />
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList
          variant="line"
          className="-mx-4 h-11! w-[calc(100%+2rem)] justify-start gap-0 overflow-x-auto overflow-y-hidden border-b px-4 [scrollbar-width:none] sm:mx-0 sm:w-full sm:px-0"
        >
          <TabsTrigger value="info">
            Información <TabCount n={0} done={tabDone("info")} />
          </TabsTrigger>
          <TabsTrigger value="photos">
            Fotos <TabCount n={count.photos} done={tabDone("photos")} />
          </TabsTrigger>
          <TabsTrigger value="inclusions">
            Qué incluye <TabCount n={count.inclusions} done={tabDone("inclusions")} />
          </TabsTrigger>
          <TabsTrigger value="route">
            Recorrido <TabCount n={count.route} done={tabDone("route")} />
          </TabsTrigger>
          <TabsTrigger value="schedules">
            Horarios <TabCount n={count.schedules} done={tabDone("schedules")} />
          </TabsTrigger>
          <TabsTrigger value="translations">Traducciones</TabsTrigger>
          {isAdmin && <TabsTrigger value="reviews">Reseñas</TabsTrigger>}
        </TabsList>
        {/* keepMounted: si cambiás de pestaña no se pierde lo que estabas escribiendo */}
        <TabsContent value="info" keepMounted className="pt-4">
          <ExperienceForm mode="edit" experience={exp} />
        </TabsContent>
        <TabsContent value="photos" className="pt-4">
          <ImagesTab experienceId={exp.id} />
        </TabsContent>
        <TabsContent value="inclusions" className="pt-4">
          <InclusionsTab experienceId={exp.id} />
        </TabsContent>
        <TabsContent value="route" className="pt-4">
          <ItineraryTab experienceId={exp.id} totalDuration={Number(exp.duration_min)} />
        </TabsContent>
        <TabsContent value="schedules" className="pt-4">
          <SchedulesTab experienceId={exp.id} maxPax={Number(exp.max_pax)} />
        </TabsContent>
        <TabsContent value="translations" keepMounted className="pt-4">
          <TranslationsTab experience={exp} />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="reviews" className="pt-4">
            <RatingCard key={exp.updated_at} experience={exp} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

function TabCount({ n, done }: { n: number; done?: boolean }) {
  if (done === false) return <span aria-label="(falta)" className="bg-highlight size-1.5 rounded-full" />
  if (!n) return null
  return <span className="text-muted-foreground text-xs tabular-nums">{n}</span>
}

/** Reseña externa (Google / TripAdvisor). Solo admin. */
function RatingCard({ experience: exp }: { experience: Experience }) {
  const qc = useQueryClient()
  const [rating, setRating] = React.useState(exp.external_rating != null ? String(exp.external_rating) : "")
  const [reviews, setReviews] = React.useState(String(exp.external_reviews_count ?? 0))
  const [url, setUrl] = React.useState(exp.external_reviews_url ?? "")

  const r = rating === "" ? null : Number(rating)
  const invalid = r !== null && (!Number.isFinite(r) || r < 0 || r > 5)

  const save = useMutation({
    mutationFn: () =>
      api.post("/experience_set_rating", {
        id: exp.id,
        external_rating: r,
        external_reviews_count: Number(reviews) || 0,
        external_reviews_url: url.trim() || null,
      }),
    onSuccess: () => {
      toast.success("Reseñas actualizadas")
      qc.invalidateQueries({ queryKey: ["experience", exp.id] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reseñas</CardTitle>
        <CardDescription>
          Se muestra en el sitio como “★ {r ?? "4.9"} ({reviews || 0} reseñas)”. Copiá los
          números de Google Maps o TripAdvisor.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-wrap items-end gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!invalid) save.mutate()
          }}
        >
          <label className="grid gap-1.5 text-sm font-medium">
            Calificación
            <Input type="number" min={0} max={5} step={0.1} className="w-24" placeholder="4.9" value={rating} onChange={(e) => setRating(e.target.value)} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Cantidad de reseñas
            <Input type="number" min={0} className="w-32" value={reviews} onChange={(e) => setReviews(e.target.value)} />
          </label>
          <label className="grid min-w-64 flex-1 gap-1.5 text-sm font-medium">
            Link a las reseñas (opcional)
            <Input type="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
          </label>
          <Button type="submit" disabled={invalid || save.isPending}>
            {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}
            Guardar
          </Button>
        </form>
        {invalid && <p className="text-destructive mt-2 text-sm">La calificación va de 0 a 5.</p>}
      </CardContent>
    </Card>
  )
}
