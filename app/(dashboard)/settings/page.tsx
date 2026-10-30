"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, PauseCircle } from "lucide-react"
import { toast } from "sonner"

import { api, apiErrorMessage } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { formatDate } from "@/lib/utils"
import type { ApiResponse, AdminUser } from "@/types"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { ChangePasswordCard } from "@/components/dashboard/change-password-card"
import { PageHeader, SectionTitle } from "@/components/page"

type AdminRow = AdminUser & { created_at?: string; last_login_at?: string }

export default function SettingsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const admins = useQuery({
    queryKey: ["admins"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<AdminRow[] | { rows: AdminRow[] }>>("/admin_list", {
        params: { limit: 100 },
      })
      const payload = data.data
      return Array.isArray(payload) ? payload : (payload?.rows ?? [])
    },
  })

  const suspendExpired = useMutation({
    mutationFn: async () =>
      (await api.post<ApiResponse<{ suspended?: number } | null>>("/subscription_killswitch", {})).data.data,
    onSuccess: (d) => {
      const n = Number(d?.suspended ?? 0)
      toast.success(
        n > 0 ? `Listo: ${n} ${n === 1 ? "cuenta pausada" : "cuentas pausadas"}` : "No había cuentas vencidas para pausar"
      )
      qc.invalidateQueries({ queryKey: ["providers"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
      setConfirmOpen(false)
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  return (
    <div className="max-w-3xl">
      <PageHeader title="Ajustes" description="Tu contraseña, el equipo con acceso y tareas de mantenimiento." />

      <section className="mb-8">
        <ChangePasswordCard />
      </section>

      <section className="mb-8">
        <SectionTitle title="Pausar cuentas vencidas" />
        <div className="bg-card space-y-4 rounded-xl border p-4 sm:p-5">
          <p className="text-[0.9375rem]">
            Pausa a todos los proveedores cuya suscripción ya venció: sus experiencias dejan de verse en el sitio y no
            reciben reservas. <span className="text-muted-foreground">Se hace solo todos los días; usalo si sabés que no corrió.</span>
          </p>
          <p className="text-muted-foreground text-sm">
            Se revierte solo: cuando registrás un pago, la cuenta vuelve a estar activa.
          </p>
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger className={buttonVariants({ variant: "destructive" })}>
              <PauseCircle />
              Pausar cuentas vencidas
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>¿Pausar las cuentas vencidas?</DialogTitle>
                <DialogDescription>
                  Solo afecta a quienes ya pasaron su fecha de vencimiento. Las cuentas al día no cambian.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={() => suspendExpired.mutate()} disabled={suspendExpired.isPending}>
                  {suspendExpired.isPending && <Loader2 className="animate-spin" />}
                  Sí, pausar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <section>
        <SectionTitle title="Personas con acceso de administrador" />
        {admins.isLoading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : admins.isError ? (
          <Alert variant="destructive">
            <AlertDescription>{apiErrorMessage(admins.error)}</AlertDescription>
          </Alert>
        ) : (
          <ul className="bg-card divide-y rounded-xl border">
            {(admins.data ?? [])
              .filter((a) => a.role === "admin")
              .map((a) => (
                <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block font-medium">
                      {a.full_name}
                      {Number(a.id) === Number(user?.id) && <span className="text-muted-foreground font-normal"> (vos)</span>}
                    </span>
                    <span className="text-muted-foreground block truncate text-sm">{a.email}</span>
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {a.last_login_at ? `Entró el ${formatDate(a.last_login_at)}` : "Nunca entró"}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  )
}
