import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { ProviderForm } from "@/components/providers/provider-form"

export default function NewProviderPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          href="/providers"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ChevronLeft className="size-4" />
          Volver a proveedores
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo proveedor</h1>
        <p className="text-muted-foreground text-sm">
          Se crea en estado <code className="bg-muted rounded px-1">trial</code>{" "}
          y queda pendiente de primer pago para activarse.
        </p>
      </div>
      <ProviderForm mode="create" />
    </div>
  )
}
