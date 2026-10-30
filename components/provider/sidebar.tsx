"use client"

import { CalendarCheck, House, Map, UserRound } from "lucide-react"

import { AppShell, type NavItem } from "@/components/nav"
import { isPending, useBookings } from "@/components/provider/queries"

export function ProviderShell({ children }: { children: React.ReactNode }) {
  const bookings = useBookings()
  const pending = bookings.data?.filter(isPending).length ?? 0

  const items: NavItem[] = [
    { href: "/provider", label: "Inicio", icon: House },
    { href: "/provider/reservas", label: "Reservas", icon: CalendarCheck, badge: pending },
    { href: "/provider/experiencias", label: "Experiencias", icon: Map },
    { href: "/provider/cuenta", label: "Mi cuenta", icon: UserRound },
  ]
  return (
    <AppShell items={items} subtitle="Panel de guía">
      {children}
    </AppShell>
  )
}
