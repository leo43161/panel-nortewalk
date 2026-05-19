import { Badge } from "@/components/ui/badge"
import type { ProviderStatus } from "@/types"

const labels: Record<ProviderStatus, string> = {
  active: "Activo",
  trial: "Prueba",
  suspended: "Suspendido",
  banned: "Baneado",
}

const classes: Record<ProviderStatus, string> = {
  active: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  trial: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  suspended: "bg-red-100 text-red-800 hover:bg-red-100",
  banned: "bg-zinc-200 text-zinc-700 hover:bg-zinc-200",
}

export function StatusBadge({ status }: { status: ProviderStatus }) {
  return (
    <Badge variant="secondary" className={classes[status]}>
      {labels[status]}
    </Badge>
  )
}
