import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { ExperienceCreateForm } from "@/components/experiences/experience-create-form"

export default function NewExperiencePage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link
          href="/experiences"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ChevronLeft className="size-4" />
          Volver a experiencias
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nueva experiencia</h1>
        <p className="text-muted-foreground text-sm">
          Carga rápida. Imágenes, inclusiones, itinerario y horarios se
          completan después en el editor.
        </p>
      </div>
      <ExperienceCreateForm />
    </div>
  )
}
