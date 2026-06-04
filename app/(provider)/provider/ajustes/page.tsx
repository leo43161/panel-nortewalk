"use client"

import * as React from "react"
import { Palette, User } from "lucide-react"

import { useAuth } from "@/hooks/useAuth"
import { useTheme } from "@/hooks/useTheme"

import { Card, CardContent } from "@/components/ui/card"
import { ChangePasswordCard } from "@/components/dashboard/change-password-card"
import { ThemeSegmented } from "@/components/dashboard/theme-toggle"

export default function ProviderAjustesPage() {
  const { user } = useAuth()
  const { resolved } = useTheme()

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
        <p className="text-muted-foreground text-sm">
          Tu cuenta y apariencia del panel.
        </p>
      </div>

      <section className="space-y-3">
        <Header
          icon={<User className="size-4" />}
          title="Mi cuenta"
          description="Datos de tu sesión."
        />
        <Card>
          <CardContent className="grid gap-3 pt-6 sm:grid-cols-3">
            <Field label="Email" value={user?.email ?? "—"} />
            <Field label="Rol" value="Provider" />
            <Field
              label="Provider"
              value={user?.providerId ? `#${user.providerId}` : "—"}
              mono
            />
          </CardContent>
        </Card>
        <ChangePasswordCard />
      </section>

      <section className="space-y-3">
        <Header
          icon={<Palette className="size-4" />}
          title="Apariencia"
          description="Cómo se ve el panel. Se guarda en este navegador."
        />
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <div>
              <p className="text-sm font-medium">Tema</p>
              <p className="text-muted-foreground text-xs">
                Aplicado actualmente:{" "}
                <span className="font-medium capitalize">{resolved}</span>.
              </p>
            </div>
            <ThemeSegmented />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function Header({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  mono,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="space-y-0.5">
      <div className="text-muted-foreground text-[11px] uppercase tracking-wide">
        {label}
      </div>
      <div className={mono ? "font-mono text-sm" : "text-sm"}>{value}</div>
    </div>
  )
}
