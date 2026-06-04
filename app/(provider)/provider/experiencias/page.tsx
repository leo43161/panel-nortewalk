"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Loader2, MapPin, Plus } from "lucide-react"

import { api, apiErrorMessage } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"
import type { ApiResponse, Experience, Vertical } from "@/types"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const VERTICAL_LABEL: Record<Vertical, string> = {
  fwt: "FWT",
  adventure: "Aventura",
  experience: "Experiencia",
  gastronomy: "Gastronomía",
}

const VERTICAL_TONE: Record<Vertical, string> = {
  fwt: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  adventure:
    "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  experience:
    "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  gastronomy:
    "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
}

export default function ProviderExperienciasPage() {
  const { user } = useAuth()
  const providerId = user?.providerId

  const list = useQuery({
    queryKey: ["provider-experiences", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Experience[]>>(
        "/experience_list",
        { params: { limit: 200 } }
      )
      return data.data ?? []
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis experiencias</h1>
          <p className="text-muted-foreground text-sm">
            Editá tus experiencias, imágenes, itinerario y horarios.
          </p>
        </div>
        <Link
          href="/provider/experiencias/new"
          className={buttonVariants({ size: "sm" })}
        >
          <Plus className="size-4" />
          Nueva experiencia
        </Link>
      </div>

      {list.isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : list.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{apiErrorMessage(list.error)}</AlertDescription>
        </Alert>
      ) : (list.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-sm">
            <p>Todavía no tenés experiencias cargadas.</p>
            <Link
              href="/provider/experiencias/new"
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="size-4" />
              Crear mi primera experiencia
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(list.data ?? []).map((e) => {
            const isActive = Number(e.is_active) === 1
            return (
              <Link
                key={e.id}
                href={`/provider/experiencias/${e.id}`}
                className="hover:bg-muted/30 group flex flex-col gap-2 rounded-md border p-3 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <Badge
                    variant="secondary"
                    className={cn("text-xs", VERTICAL_TONE[e.vertical])}
                  >
                    {VERTICAL_LABEL[e.vertical]}
                  </Badge>
                  {!isActive && (
                    <Badge variant="secondary" className="text-xs">
                      Inactiva
                    </Badge>
                  )}
                </div>
                <h3 className="line-clamp-2 text-sm font-semibold leading-tight">
                  {e.title}
                </h3>
                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                  <MapPin className="size-3" />
                  {e.city}
                </p>
                {e.total_leads !== undefined && (
                  <p className="text-muted-foreground text-xs">
                    {e.total_leads} {e.total_leads === 1 ? "lead" : "leads"} en total
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
