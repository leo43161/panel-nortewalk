import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ProviderStatus } from "@/types"

const labels: Record<ProviderStatus, string> = {
  active: "Activo",
  trial: "En prueba",
  suspended: "Suspendido",
  banned: "Baneado",
}

const classes: Record<ProviderStatus, string> = {
  active:
    "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:ring-emerald-800/60",
  trial:
    "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:ring-amber-800/60",
  suspended:
    "bg-red-100 text-red-800 ring-red-200 dark:bg-red-900/40 dark:text-red-200 dark:ring-red-800/60",
  banned:
    "bg-zinc-200 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700",
}

export function StatusBadge({
  status,
  className,
}: {
  status: ProviderStatus
  className?: string
}) {
  return (
    <Badge
      variant="secondary"
      className={cn("ring-1 ring-inset", classes[status], className)}
    >
      {labels[status]}
    </Badge>
  )
}
