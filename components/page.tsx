import Link from "next/link"
import { ChevronLeft, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

/** Título de página: lo mismo en todas las pantallas (volver, título, ayuda, acciones). */
export function PageHeader({
  title,
  description,
  actions,
  back,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  back?: { href: string; label: string }
  className?: string
}) {
  return (
    <div className={cn("mb-6 space-y-3", className)}>
      {back && (
        <Link
          href={back.href}
          className="text-muted-foreground hover:text-foreground -ml-1 inline-flex h-8 items-center gap-1 rounded-md px-1 text-sm font-medium"
        >
          <ChevronLeft className="size-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-[1.625rem] leading-tight font-semibold tracking-tight md:text-[1.875rem]">{title}</h1>
          {description && <p className="text-muted-foreground max-w-prose text-[0.9375rem]">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

/** Título de un bloque dentro de la página. */
export function SectionTitle({
  title,
  action,
  className,
}: {
  title: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {action}
    </div>
  )
}

/** Lista vacía: qué pasa y qué hacer. */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("bg-card flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center", className)}>
      <span className="bg-muted text-muted-foreground mb-3 flex size-11 items-center justify-center rounded-full">
        <Icon className="size-5" />
      </span>
      <p className="font-medium">{title}</p>
      {children && <p className="text-muted-foreground mt-1 max-w-sm text-sm">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** Placeholder mientras carga una lista de tarjetas. */
export function ListSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true" aria-label="Cargando">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  )
}
