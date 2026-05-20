"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  PauseCircle,
} from "lucide-react"

import { api, apiErrorMessage } from "@/lib/api"
import type { ApiResponse, ProviderStatus } from "@/types"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"

interface Transition {
  to: ProviderStatus
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  destructive?: boolean
}

const TRANSITIONS: Transition[] = [
  {
    to: "active",
    label: "Activar",
    icon: CheckCircle2,
    description:
      "Marca el proveedor como activo. Sus experiencias quedan visibles al público.",
  },
  {
    to: "trial",
    label: "Pasar a prueba",
    icon: Clock,
    description: "Vuelve a estado de prueba. Útil al re-onboardar.",
  },
  {
    to: "suspended",
    label: "Suspender",
    icon: PauseCircle,
    description:
      "Pausa la cuenta. Sus experiencias se ocultan al público. Reversible.",
    destructive: true,
  },
  {
    to: "banned",
    label: "Banear",
    icon: Ban,
    description:
      "Bloquea permanentemente. Usar sólo en casos graves (fraude, denuncias).",
    destructive: true,
  },
]

export function StatusActions({
  providerId,
  current,
}: {
  providerId: number
  current: ProviderStatus
}) {
  const qc = useQueryClient()
  const [pending, setPending] = React.useState<Transition | null>(null)
  const [reason, setReason] = React.useState("")

  const mutation = useMutation({
    mutationFn: async ({
      next,
      reason,
    }: {
      next: ProviderStatus
      reason: string
    }) => {
      const { data } = await api.post<ApiResponse<unknown>>(
        "/provider_change_status",
        { provider_id: providerId, status: next, reason: reason || undefined }
      )
      return data
    },
    onSuccess: () => {
      toast.success("Estado actualizado")
      qc.invalidateQueries({ queryKey: ["provider", providerId] })
      qc.invalidateQueries({ queryKey: ["provider-history", providerId] })
      qc.invalidateQueries({ queryKey: ["providers"] })
      setPending(null)
      setReason("")
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={buttonVariants({ variant: "outline" })}
          disabled={mutation.isPending}
        >
          {mutation.isPending && (
            <Loader2 className="size-4 animate-spin" />
          )}
          Cambiar estado
          <ChevronDown className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Estado actual: {current}</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {TRANSITIONS.filter((t) => t.to !== current).map((t) => {
            const Icon = t.icon
            return (
              <DropdownMenuItem
                key={t.to}
                variant={t.destructive ? "destructive" : "default"}
                onClick={() => {
                  setReason("")
                  setPending(t)
                }}
              >
                <Icon className="size-4" />
                {t.label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={!!pending}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <DialogContent className="sm:max-w-md">
          {pending && (
            <>
              <DialogHeader>
                <DialogTitle>{pending.label} proveedor</DialogTitle>
                <DialogDescription>{pending.description}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  Motivo{" "}
                  <span className="text-muted-foreground font-normal">
                    (opcional, se guarda en el historial)
                  </span>
                </label>
                <Textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej: falta de pago, pedido del proveedor, etc."
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setPending(null)}
                  disabled={mutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant={pending.destructive ? "destructive" : "default"}
                  disabled={mutation.isPending}
                  onClick={() =>
                    mutation.mutate({ next: pending.to, reason })
                  }
                >
                  {mutation.isPending && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  Confirmar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
