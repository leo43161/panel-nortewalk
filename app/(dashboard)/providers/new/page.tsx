import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { ProviderForm } from "@/components/providers/provider-form"

export default function NewProviderPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Link
          href="/providers"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ChevronLeft className="size-4" />
          Volver
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-semibold">Nuevo proveedor</h1>
        <p className="text-muted-foreground text-sm">
          Se crea en estado <code>trial</code> con los días indicados.
        </p>
      </div>
      <ProviderForm />
    </div>
  )
}
