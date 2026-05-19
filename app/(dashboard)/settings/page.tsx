"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Loader2, Power } from "lucide-react"
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

type AdminRow = AdminUser & { created_at?: string }

export default function SettingsPage() {
  const { user } = useAuth()
  const isSuper = user?.role === "superadmin"
  const qc = useQueryClient()
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const admins = useQuery({
    queryKey: ["admins"],
    enabled: isSuper,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<AdminRow[]>>(
        "/admin_list",
        { params: { limit: 100 } }
      )
      return data.data ?? []
    },
  })

  const killswitch = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<
        ApiResponse<{ suspended: number } | unknown>
      >("/subscription_killswitch", {})
      return data
    },
    onSuccess: (data) => {
      toast.success(data.message ?? "Killswitch ejecutado")
      qc.invalidateQueries({ queryKey: ["providers"] })
      qc.invalidateQueries({ queryKey: ["expiring"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
      setConfirmOpen(false)
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
        <p className="text-muted-foreground text-sm">
          Operaciones de mantenimiento del sistema.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="size-4 text-red-600" />
            Killswitch de suscripciones
          </CardTitle>
          <CardDescription>
            Suspende manualmente a todos los proveedores con{" "}
            <code>paid_until &lt; HOY</code>. Normalmente se ejecuta como cron
            diario. Requiere rol <code>superadmin</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSuper ? (
            <Alert variant="destructive">
              <AlertTitle>Solo superadmin</AlertTitle>
              <AlertDescription>
                Tu rol actual ({user?.role ?? "—"}) no puede ejecutar el
                killswitch.
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
                    <AlertTriangle className="size-5 text-red-600" />
                    Confirmar killswitch
                  </DialogTitle>
                  <DialogDescription>
                    Esto suspenderá a TODOS los proveedores vencidos. No
                    afecta a quienes tienen <code>paid_until ≥ HOY</code>. Es
                    reversible (registrando un pago vuelven a active), pero
                    durante el lapso suspended no reciben leads.
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

      <Card>
        <CardHeader>
          <CardTitle>Administradores</CardTitle>
          <CardDescription>
            Cuentas con acceso al panel. Visible solo para superadmin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSuper ? (
            <p className="text-muted-foreground text-sm">
              Tu rol no puede ver la lista de admins.
            </p>
          ) : admins.isLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="text-muted-foreground size-5 animate-spin" />
            </div>
          ) : admins.isError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {apiErrorMessage(admins.error)}
              </AlertDescription>
            </Alert>
          ) : (admins.data ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin admins.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Creado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(admins.data ?? []).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.email}</TableCell>
                    <TableCell>{a.full_name}</TableCell>
                    <TableCell>
                      <RoleBadge role={a.role} />
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
    </div>
  )
}

function RoleBadge({ role }: { role: Role }) {
  const c =
    role === "superadmin"
      ? "bg-purple-100 text-purple-800 hover:bg-purple-100"
      : role === "admin"
      ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
      : "bg-zinc-200 text-zinc-700 hover:bg-zinc-200"
  return (
    <Badge variant="secondary" className={c}>
      {role}
    </Badge>
  )
}
