"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  Info,
  Loader2,
  Palette,
  Power,
  Shield,
  User as UserIcon,
} from "lucide-react"
import { toast } from "sonner"

import { api, apiErrorMessage } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { formatDate } from "@/lib/utils"
import type { ApiResponse, AdminUser, Role } from "@/types"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChangePasswordCard } from "@/components/dashboard/change-password-card"
import { ThemeSegmented } from "@/components/dashboard/theme-toggle"
import { useTheme } from "@/hooks/useTheme"

type AdminRow = AdminUser & { created_at?: string; last_login_at?: string }

export default function SettingsPage() {
  const { user, ready } = useAuth()
  const isAdmin = user?.role === "admin"
  const qc = useQueryClient()
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const { resolved } = useTheme()

  const admins = useQuery({
    queryKey: ["admins"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<AdminRow[]>>("/admin_list", {
        params: { limit: 100 },
      })
      // Backend devuelve { rows, total } anidados en `data`
      const payload = data.data as unknown
      if (Array.isArray(payload)) return payload as AdminRow[]
      if (payload && typeof payload === "object" && "rows" in payload) {
        return (payload as { rows: AdminRow[] }).rows ?? []
      }
      return []
    },
  })

  const killswitch = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<
        ApiResponse<{ suspended?: number } | unknown>
      >("/subscription_killswitch", {})
      return data
    },
    onSuccess: (data) => {
      const d = data.data as { suspended?: number } | null
      const count = d?.suspended ?? 0
      toast.success(
        count > 0
          ? `Killswitch ejecutado: ${count} proveedor${count === 1 ? "" : "es"} suspendido${count === 1 ? "" : "s"}`
          : "Killswitch ejecutado — sin vencidos para suspender"
      )
      qc.invalidateQueries({ queryKey: ["providers"] })
      qc.invalidateQueries({ queryKey: ["expiring"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
      setConfirmOpen(false)
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
        <p className="text-muted-foreground text-sm">
          Cuenta, apariencia y operaciones de mantenimiento.
        </p>
      </div>

      {/* Mi cuenta */}
      <section className="space-y-4">
        <SectionHeader
          icon={<UserIcon className="size-4" />}
          title="Mi cuenta"
          description="Sesión y credenciales del usuario actual."
        />
        <Card>
          <CardContent className="grid gap-3 pt-6 sm:grid-cols-3">
            <Field label="Email" value={user?.email ?? "—"} />
            <Field
              label="Rol"
              value={
                ready && user?.role ? (
                  <RoleBadge role={user.role} />
                ) : (
                  "—"
                )
              }
            />
            <Field label="ID" value={user?.id ? `#${user.id}` : "—"} mono />
          </CardContent>
        </Card>
        <ChangePasswordCard />
      </section>

      {/* Apariencia */}
      <section className="space-y-4">
        <SectionHeader
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
                &ldquo;Sistema&rdquo; sigue la preferencia del SO.
              </p>
            </div>
            <ThemeSegmented />
          </CardContent>
        </Card>
      </section>

      {/* Mantenimiento */}
      <section className="space-y-4">
        <SectionHeader
          icon={<Shield className="size-4" />}
          title="Mantenimiento"
          description="Operaciones del sistema."
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Power className="size-4 text-red-600 dark:text-red-400" />
              Killswitch de suscripciones
            </CardTitle>
            <CardDescription>
              Suspende manualmente a todos los proveedores con{" "}
              <code className="bg-muted rounded px-1">paid_until &lt; HOY</code>.
              Normalmente se ejecuta como cron diario.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="size-4" />
              <AlertTitle>¿Qué hace exactamente?</AlertTitle>
              <AlertDescription className="space-y-1">
                <p>
                  Recorre la tabla <code>providers</code> y pasa a{" "}
                  <code>status=suspended</code> a quienes ya vencieron su
                  suscripción.
                </p>
                <p>
                  Mientras están suspendidos <strong>no aparecen</strong> en
                  listados públicos ni reciben leads. Es reversible:
                  registrando un pago vuelven automáticamente a{" "}
                  <code>active</code>.
                </p>
                <p>
                  Usalo si la cron no se disparó (corte de servicio, deploy)
                  y necesitás forzar el cierre.
                </p>
              </AlertDescription>
            </Alert>

            {!ready ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Verificando permisos…
              </div>
            ) : !isAdmin ? (
              <Alert variant="destructive">
                <AlertTitle>Solo admin</AlertTitle>
                <AlertDescription>
                  Tu rol actual ({user?.role ?? "desconocido"}) no puede
                  ejecutar el killswitch.
                </AlertDescription>
              </Alert>
            ) : (
              <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogTrigger
                  className={buttonVariants({ variant: "destructive" })}
                >
                  <Power className="size-4" />
                  Ejecutar killswitch
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />
                      Confirmar killswitch
                    </DialogTitle>
                    <DialogDescription>
                      Esto suspenderá a TODOS los proveedores vencidos. No
                      afecta a quienes tienen{" "}
                      <code className="bg-muted rounded px-1">
                        paid_until ≥ HOY
                      </code>
                      . Reversible: si registrás un pago vuelven a active.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setConfirmOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => killswitch.mutate()}
                      disabled={killswitch.isPending}
                    >
                      {killswitch.isPending && (
                        <Loader2 className="size-4 animate-spin" />
                      )}
                      Ejecutar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Administradores */}
      {isAdmin && (
        <section className="space-y-4">
          <SectionHeader
            icon={<UserIcon className="size-4" />}
            title="Administradores"
            description="Cuentas con acceso al panel."
          />
          <Card>
            <CardContent className="p-0">
              {admins.isLoading ? (
                <div className="flex h-24 items-center justify-center">
                  <Loader2 className="text-muted-foreground size-5 animate-spin" />
                </div>
              ) : admins.isError ? (
                <Alert variant="destructive" className="m-4">
                  <AlertDescription>
                    {apiErrorMessage(admins.error)}
                  </AlertDescription>
                </Alert>
              ) : (admins.data ?? []).length === 0 ? (
                <p className="text-muted-foreground p-4 text-sm">Sin admins.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Último login</TableHead>
                      <TableHead>Creado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(admins.data ?? []).map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          {a.email}
                          {a.id === user?.id && (
                            <Badge
                              variant="secondary"
                              className="ml-2 text-[10px]"
                            >
                              vos
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{a.full_name}</TableCell>
                        <TableCell>
                          <RoleBadge role={a.role} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {a.last_login_at ? formatDate(a.last_login_at) : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatDate(a.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  )
}

function SectionHeader({
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

function RoleBadge({ role }: { role: Role }) {
  const c =
    role === "admin"
      ? "bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300"
      : "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
  return (
    <Badge variant="secondary" className={c}>
      {role}
    </Badge>
  )
}
