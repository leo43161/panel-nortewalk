"use client"

import { useAuth } from "@/hooks/useAuth"
import { ExperienceForm } from "@/components/experiences/experience-form"
import { ListSkeleton, PageHeader } from "@/components/page"

export default function NewProviderExperiencePage() {
  const { user } = useAuth()
  const providerId = user?.providerId

  return (
    <div className="max-w-4xl">
      <PageHeader
        back={{ href: "/provider/experiencias", label: "Experiencias" }}
        title="Nueva experiencia"
        description="Primero lo básico. Al guardar seguís con fotos, qué incluye y horarios: se publica cuando esté completa."
      />
      {!providerId ? (
        <ListSkeleton />
      ) : (
        <ExperienceForm mode="create" forcedProviderId={providerId} redirectBase="/provider/experiencias" />
      )}
    </div>
  )
}
