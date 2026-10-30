"use client"

import { CalendarCheck, House, Map, Settings, Users } from "lucide-react"

import { AppShell, type NavItem } from "@/components/nav"

const items: NavItem[] = [
  { href: "/dashboard", label: "Inicio", icon: House },
  { href: "/providers", label: "Proveedores", icon: Users, also: ["/subscriptions"] },
  { href: "/experiences", label: "Experiencias", icon: Map },
  { href: "/leads", label: "Reservas", icon: CalendarCheck },
  { href: "/settings", label: "Ajustes", icon: Settings },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell items={items} subtitle="Administración">
      {children}
    </AppShell>
  )
}
