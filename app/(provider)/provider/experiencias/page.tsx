"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { AlertCircle, Eye, EyeOff, ImageIcon, MapPin, Plus } from "lucide-react"

import { api, apiErrorMessage } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { VERTICAL_LABEL, cityLabel } from "@/lib/labels"
import { cn } from "@/lib/utils"
import type { ApiResponse, Experience } from "@/types"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { buttonVariants } from "@/components/ui/button"
import { EmptyState, PageHeader } from "@/components/page"
import { Skeleton } from "@/components/ui/skeleton"
import { experienceGaps } from "@/components/experiences/readiness"

export default function ProviderExperienciasPage() {
  const { user } = useAuth()
  const providerId = user?.providerId

  const list = useQuery({
    queryKey: ["experiences", "mine", providerId],
    enabled: !!providerId,
    queryFn: async () =>
      (await api.get<ApiResponse<Experience[]>>("/experience_list", { params: { limit: 50 } })).data.data ?? [],
  })

  const newButton = (
    <Link href="/provider/experiencias/new" className={buttonVariants()}>
      <Plus />
      Nueva experiencia
    </Link>
  )

  return (
    <>
      <PageHeader
        title="Experiencias"
        description="Tocá una para cambiar fotos, horarios, precio o lo que incluye."
        actions={list.data?.length ? newButton : undefined}
      />

      {list.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
          ))}
        </div>
      ) : list.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{apiErrorMessage(list.error)}</AlertDescription>
        </Alert>
      ) : !list.data?.length ? (
        <EmptyState icon={ImageIcon} title="Todavía no cargaste experiencias" action={newButton}>
          Empezá por el nombre y el tipo. Después le sumás fotos y horarios.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.data.map((e) => (
            <ExperienceCard key={e.id} experience={e} />
          ))}
        </div>
      )}
    </>
  )
}

function ExperienceCard({ experience: e }: { experience: Experience }) {
  const visible = Number(e.is_active) === 1
  const gaps = experienceGaps(e)
  const leads = Number(e.total_leads ?? 0)

  return (
    <Link
      href={`/provider/experiencias/${e.id}`}
      className="bg-card group flex flex-col overflow-hidden rounded-xl border shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="bg-muted text-muted-foreground relative flex aspect-[16/10] items-center justify-center">
        {e.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.cover_image} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-sm">
            <ImageIcon className="size-6" />
            Sin fotos
          </span>
        )}
        <span
          className={cn(
            "absolute top-3 left-3 inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium shadow-sm",
            visible ? "bg-emerald-50 text-emerald-800" : "bg-card text-foreground"
          )}
        >
          {visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          {visible ? "Visible en el sitio" : "Oculta"}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {VERTICAL_LABEL[e.vertical]} · {e.category}
        </span>
        <h3 className="line-clamp-2 leading-snug font-semibold">{e.title}</h3>
        <p className="text-muted-foreground flex items-center gap-1 text-sm">
          <MapPin className="size-3.5" />
          {cityLabel(e.city)}
          <span className="ml-auto">
            {leads} {leads === 1 ? "reserva" : "reservas"}
          </span>
        </p>
        {gaps.length > 0 && (
          <p className="text-highlight-foreground mt-2 flex items-start gap-1.5 border-t pt-2.5 text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            Le falta: {gaps.join(", ").toLowerCase()}
          </p>
        )}
      </div>
    </Link>
  )
}
