import { ExperienceForm } from "@/components/experiences/experience-form"
import { PageHeader } from "@/components/page"

export default function NewExperiencePage() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        back={{ href: "/experiences", label: "Experiencias" }}
        title="Nueva experiencia"
        description="Primero lo básico. Al guardar seguís con fotos, qué incluye y horarios."
      />
      <ExperienceForm mode="create" />
    </div>
  )
}
