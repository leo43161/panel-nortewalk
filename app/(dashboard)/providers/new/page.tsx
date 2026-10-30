import { PageHeader } from "@/components/page"
import { ProviderForm } from "@/components/providers/provider-form"

export default function NewProviderPage() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        back={{ href: "/providers", label: "Proveedores" }}
        title="Nuevo proveedor"
        description="Arranca en período de prueba. Se activa cuando registrás el primer pago."
      />
      <ProviderForm mode="create" />
    </div>
  )
}
