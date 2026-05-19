import { Badge } from "@/components/ui/badge"
import type { LeadStatus } from "@/types"

const labels: Record<LeadStatus, string> = {
  new: "Nuevo",
  redirected_whatsapp: "WhatsApp",
  contacted: "Contactado",
  converted: "Convertido",
  lost: "Perdido",
  spam: "Spam",
}

const classes: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  redirected_whatsapp: "bg-cyan-100 text-cyan-800 hover:bg-cyan-100",
  contacted: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  converted: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  lost: "bg-zinc-200 text-zinc-700 hover:bg-zinc-200",
  spam: "bg-red-100 text-red-800 hover:bg-red-100",
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge variant="secondary" className={classes[status]}>
      {labels[status]}
    </Badge>
  )
}

export const LEAD_STATUS_LABELS = labels
