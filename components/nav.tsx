"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Check, LogOut, Monitor, Moon, Sun, type LucideIcon } from "lucide-react"

import { BrandLogo } from "@/components/brand-logo"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/useAuth"
import { useTheme, type ThemePref } from "@/hooks/useTheme"
import { cn } from "@/lib/utils"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Otras rutas que también marcan este item como activo. */
  also?: string[]
  /** Número a la derecha (ej. reservas sin responder). */
  badge?: number
}

/** El primer item es el inicio: solo se marca activo en su ruta exacta. */
function useIsActive(items: NavItem[]) {
  const pathname = usePathname()
  const home = items[0]?.href
  return (item: NavItem) =>
    item.href === home
      ? pathname === item.href
      : [item.href, ...(item.also ?? [])].some((h) => pathname === h || pathname.startsWith(h + "/"))
}

/**
 * Esqueleto del panel. Escritorio: barra lateral con la cuenta abajo.
 * Celular: barra superior con la marca y navegación fija abajo (al alcance del pulgar).
 */
export function AppShell({
  items,
  subtitle,
  children,
}: {
  items: NavItem[]
  subtitle: string
  children: React.ReactNode
}) {
  const isActive = useIsActive(items)

  return (
    <div className="bg-background flex min-h-dvh w-full">
      <aside className="bg-sidebar text-sidebar-foreground sticky top-0 hidden h-dvh w-64 shrink-0 flex-col md:flex">
        <Link href={items[0].href} className="flex h-16 items-center gap-2.5 px-5">
          <BrandLogo className="size-8" />
          <span className="leading-none">
            <span className="text-sidebar-accent-foreground font-logo block text-lg">Norte Walk</span>
            <span className="text-sidebar-foreground/60 mt-1 block text-xs">{subtitle}</span>
          </span>
        </Link>
        <nav aria-label="Secciones" className="flex-1 space-y-1 px-3 pt-4">
          {items.map((item) => {
            const active = isActive(item)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-lg px-3 text-[0.9375rem] font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className={cn("size-[1.125rem] shrink-0", active ? "text-sidebar-primary" : "opacity-70")} />
                <span className="flex-1">{item.label}</span>
                {!!item.badge && <NavBadge n={item.badge} />}
              </Link>
            )
          })}
        </nav>
        <div className="border-sidebar-border border-t p-3">
          <AccountMenu variant="sidebar" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-sidebar text-sidebar-foreground sticky top-0 z-20 flex h-14 items-center justify-between px-4 pt-[env(safe-area-inset-top)] md:hidden">
          <Link href={items[0].href} className="flex items-center gap-2">
            <BrandLogo className="size-7" />
            <span className="text-sidebar-accent-foreground font-logo text-base">Norte Walk</span>
          </Link>
          <AccountMenu variant="topbar" />
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 sm:px-6 md:pt-8 md:pb-12 lg:px-8">
          {children}
        </main>

        <nav
          aria-label="Secciones"
          className="bg-card/95 fixed inset-x-0 bottom-0 z-20 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        >
          <ul className="mx-auto flex max-w-md">
            {items.map((item) => {
              const active = isActive(item)
              const Icon = item.icon
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium",
                      active ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "relative flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                        active && "bg-primary/10"
                      )}
                    >
                      <Icon className="size-5" />
                      {!!item.badge && (
                        <span className="bg-highlight absolute -top-1 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] font-semibold text-white tabular-nums">
                          {item.badge}
                        </span>
                      )}
                    </span>
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </div>
  )
}

function NavBadge({ n }: { n: number }) {
  return (
    <span className="bg-sidebar-primary text-sidebar-primary-foreground flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums">
      {n}
    </span>
  )
}

const THEMES: { value: ThemePref; label: string; Icon: LucideIcon }[] = [
  { value: "light", label: "Claro", Icon: Sun },
  { value: "dark", label: "Oscuro", Icon: Moon },
  { value: "system", label: "Como el dispositivo", Icon: Monitor },
]

function AccountMenu({ variant }: { variant: "sidebar" | "topbar" }) {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const email = user?.email ?? ""
  const initials = email.slice(0, 2).toUpperCase() || "?"
  const role = user?.role === "admin" ? "Administrador" : "Guía"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Mi cuenta"
        className={cn(
          "flex items-center gap-2.5 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/50",
          variant === "sidebar" ? "hover:bg-sidebar-accent w-full p-2" : "p-1"
        )}
      >
        <span className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
          {initials}
        </span>
        {variant === "sidebar" && (
          <span className="min-w-0 flex-1 leading-tight">
            <span className="text-sidebar-accent-foreground block truncate text-sm font-medium">{email}</span>
            <span className="text-sidebar-foreground/60 block text-xs">{role}</span>
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={variant === "sidebar" ? "start" : "end"} side={variant === "sidebar" ? "top" : "bottom"} className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-muted-foreground truncate text-xs font-normal">{email}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs">Apariencia</DropdownMenuLabel>
          {THEMES.map(({ value, label, Icon }) => (
            <DropdownMenuItem key={value} onClick={() => setTheme(value)}>
              <Icon />
              <span className="flex-1">{label}</span>
              {theme === value && <Check className="text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
