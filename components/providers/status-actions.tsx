"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ChevronDown } from "lucide-react"

import { api, apiErrorMessage } from "@/lib/api"
import type { ApiResponse, ProviderStatus } from "@/types"

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

const TRANSITIONS: { to: ProviderStatus; label: string }[] = [
  { to: "active", label: "Activar" },
  { to: "trial", label: "Pasar a prueba" },
  { to: "suspended", label: "Suspender" },
  { to: "banned", label: "Banear" },
]

export function StatusActions({
  providerId,
  current,
}: {
  providerId: number
  current: ProviderStatus
}) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (next: ProviderStatus) => {
      const reason = window.prompt(`Motivo del cambio a "${next}" (opcional):`) ?? ""
      const { data } = await api.post<ApiResponse<unknown>>(
        "/provider_change_status",
        { provider_id: providerId, status: next, reason }
      )
      return data
    },
    onSuccess: () => {
      toast.success("Estado actualizado")
      qc.invalidateQueries({ queryKey: ["provider", providerId] })
      qc.invalidateQueries({ queryKey: ["providers"] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({ variant: "outline" })}
        disabled={mutation.isPending}
      >
        Cambiar estado
        <ChevronDown className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Actual: {current}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {TRANSITIONS.filter((t) => t.to !== current).map((t) => (
          <DropdownMenuItem
            key={t.to}
            onClick={() => mutation.mutate(t.to)}
          >
            {t.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
