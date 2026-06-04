"use client"

import { usePathname } from "next/navigation"
import { LogOut, User } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/dashboard/theme-toggle"

const PAGE_TITLES: Record<string, string> = {
  "/provider": "Inicio",
  "/provider/reservas": "Reservas",
  "/provider/leads": "Mensajes",
  "/provider/experiencias": "Mis experiencias",
  "/provider/suscripcion": "Suscripción",
  "/provider/ajustes": "Ajustes",
}

function usePageTitle(): string {
  const pathname = usePathname()
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  for (const [key, label] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(key + "/")) return label
  }
  return "Panel"
}

export function ProviderHeader() {
  const { user, logout } = useAuth()
  const title = usePageTitle()
  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase()

  return (
    <header className="bg-background/80 sticky top-0 z-10 flex h-14 items-center justify-between border-b px-4 backdrop-blur">
      <h2 className="text-foreground text-sm font-semibold tracking-tight">{title}</h2>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "gap-2"
            )}
          >
            <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full text-[10px] font-semibold">
              {initials}
            </span>
            <span className="hidden text-xs sm:block">{user?.email}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex items-center gap-2">
                  <User className="size-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user?.email}</span>
                    <span className="text-muted-foreground text-xs">
                      Guía · provider #{user?.providerId ?? "?"}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="size-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
