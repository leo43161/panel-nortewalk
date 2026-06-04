"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Map,
  MessageSquare,
  Settings,
} from "lucide-react"

import { BrandLogo } from "@/components/brand-logo"
import { cn } from "@/lib/utils"

const items = [
  { href: "/provider", label: "Inicio", icon: LayoutDashboard },
  { href: "/provider/reservas", label: "Reservas", icon: CalendarDays },
  { href: "/provider/leads", label: "Mensajes", icon: MessageSquare },
  { href: "/provider/experiencias", label: "Mis experiencias", icon: Map },
  { href: "/provider/suscripcion", label: "Suscripción", icon: CreditCard },
  { href: "/provider/ajustes", label: "Ajustes", icon: Settings },
]

export function ProviderSidebar() {
  const pathname = usePathname()
  return (
    <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border hidden w-60 shrink-0 border-r md:flex md:flex-col">
      <div className="border-sidebar-border flex h-14 items-center gap-2.5 border-b px-4">
        <BrandLogo className="size-8" />
        <div className="flex flex-col leading-tight">
          <span className="text-sidebar-accent-foreground text-sm font-semibold tracking-tight">
            Norte Walk
          </span>
          <span className="text-sidebar-foreground/60 text-[10px] uppercase tracking-wider">
            Guía
          </span>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 p-2 pt-3">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/provider"
              ? pathname === "/provider"
              : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              {active && (
                <span className="bg-sidebar-primary absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full" />
              )}
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  active
                    ? "text-sidebar-primary"
                    : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground"
                )}
              />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="border-sidebar-border border-t p-3">
        <p className="text-sidebar-foreground/50 text-xs">Panel guía · v1</p>
      </div>
    </aside>
  )
}
