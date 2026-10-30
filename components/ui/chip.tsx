import * as React from "react"
import { cn } from "@/lib/utils"

/** Botón-píldora que se prende/apaga (días, idiomas, sugerencias, presets). */
export function Chip({
  active,
  className,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-full border px-3.5 text-sm pointer-coarse:h-10 whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        active
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
          : "border-border bg-card hover:border-primary/40 hover:bg-muted",
        className
      )}
      {...props}
    />
  )
}

/** Tarjeta seleccionable con título + ayuda (tipo de experiencia, forma de cobro). */
export function OptionCard({
  active,
  title,
  hint,
  icon,
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "title"> & {
  active?: boolean
  title: string
  hint?: string
  icon?: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border bg-card hover:border-primary/40 hover:bg-muted/60",
        className
      )}
      {...props}
    >
      {icon && (
        <span
          className={cn(
            "mt-0.5 shrink-0",
            active ? "text-primary" : "text-muted-foreground"
          )}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        {hint && (
          <span className="text-muted-foreground block text-xs leading-snug">
            {hint}
          </span>
        )}
      </span>
    </button>
  )
}
