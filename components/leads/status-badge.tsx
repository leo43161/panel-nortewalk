import { cn } from "@/lib/utils"
import type { LeadStatus } from "@/types"

/** Estados de una reserva: nombre que entiende el guía + color (siempre con texto, nunca solo color). */
export const LEAD_STATUS: Record<LeadStatus, { label: string; hint: string; tone: string; dot: string }> = {
  new: {
    label: "Nueva",
    hint: "Todavía no le escribiste.",
    tone: "bg-highlight-soft text-highlight-foreground",
    dot: "bg-highlight",
  },
  contacted: {
    label: "Contactada",
    hint: "Le escribiste, falta que confirme.",
    tone: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  confirmed: {
    label: "Confirmada",
    hint: "Viene a la salida.",
    tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  attended: {
    label: "Vino",
    hint: "Hizo la experiencia.",
    tone: "bg-primary/10 text-primary dark:bg-primary/15",
    dot: "bg-primary",
  },
  no_show: {
    label: "No vino",
    hint: "Confirmó pero no se presentó.",
    tone: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  lost: {
    label: "Cancelada",
    hint: "No va a venir: libera el cupo.",
    tone: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/50",
  },
  spam: {
    label: "Spam",
    hint: "No era una reserva real.",
    tone: "bg-muted text-muted-foreground line-through",
    dot: "bg-muted-foreground/50",
  },
}

export const LEAD_STATUS_LABELS = Object.fromEntries(
  Object.entries(LEAD_STATUS).map(([k, v]) => [k, v.label])
) as Record<LeadStatus, string>

export function LeadStatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  const s = LEAD_STATUS[status] ?? LEAD_STATUS.new
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        s.tone,
        className
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  )
}
