"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ChevronLeft, Loader2 } from "lucide-react"

import { api, apiErrorMessage } from "@/lib/api"
import type { ApiResponse, Experience } from "@/types"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GeneralTab } from "@/components/experiences/general-tab"
import { ImagesTab } from "@/components/experiences/images-tab"
import { InclusionsTab } from "@/components/experiences/inclusions-tab"
import { ItineraryTab } from "@/components/experiences/itinerary-tab"
import { SchedulesTab } from "@/components/experiences/schedules-tab"

export function ExperienceEditor({ id }: { id: number }) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/experiences"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ChevronLeft className="size-4" />
          Volver
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{exp.title}</h1>
            <Badge variant="secondary" className="capitalize">{exp.vertical}</Badge>
            <Badge variant="secondary" className="capitalize">{exp.type}</Badge>
            {Number(exp.is_active) === 1 ? (
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                Activa
              </Badge>
            ) : (
              <Badge variant="secondary">Inactiva</Badge>
            )}
            {Number(exp.is_featured) === 1 ? (
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                Destacada
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-sm">
            slug: <code className="bg-muted rounded px-1 text-xs">{exp.slug}</code>{" "}
            · {exp.city}, {exp.province} ·{" "}
            <Link
              href={`/providers/${exp.provider_id}`}
              className="hover:underline"
            >
              {exp.provider_name ?? `Proveedor #${exp.provider_id}`}
            </Link>
          </p>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="images">Imágenes</TabsTrigger>
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
