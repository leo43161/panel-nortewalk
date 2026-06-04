"use client"

import Link from "next/link"
import { ChevronLeft, Loader2 } from "lucide-react"

import { useAuth } from "@/hooks/useAuth"
import { buttonVariants } from "@/components/ui/button"
import { ExperienceCreateForm } from "@/components/experiences/experience-create-form"

export default function NewProviderExperiencePage() {
  const { user } = useAuth()
  const providerId = user?.providerId

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link
          href="/provider/experiencias"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ChevronLeft className="size-4" />
          Volver a experiencias
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nueva experiencia</h1>
        <p className="text-muted-foreground text-sm">
          Carga rápida. Imágenes, inclusiones, itinerario y horarios se completan
          después en el editor.
        </p>
      </div>

      {!providerId ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : (
        <ExperienceCreateForm
          forcedProviderId={providerId}
          redirectBase="/provider/experiencias"
        />
      )}
    </div>
  )
}
