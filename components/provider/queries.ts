"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { api, apiErrorMessage } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { isoDate, isoDaysFromToday } from "@/lib/utils"
import { LEAD_STATUS } from "@/components/leads/status-badge"
import type { ApiResponse, Lead, LeadStatus } from "@/types"

/** MySQL manda números como string: se normalizan una vez acá. */
export const normalizeLead = (l: Lead): Lead => ({
  ...l,
  id: Number(l.id),
  experience_id: Number(l.experience_id),
  schedule_id: l.schedule_id == null ? null : Number(l.schedule_id),
  pax: Number(l.pax) || 1,
  pax_adults: Number(l.pax_adults) || 0,
  pax_children: Number(l.pax_children) || 0,
  schedule_capacity: l.schedule_capacity == null ? null : Number(l.schedule_capacity),
})

export const isPending = (l: Lead) => l.status === "new" || l.status === "contacted"

/**
 * Agenda del guía: reservas con salida entre hoy y 60 días (todas menos canceladas/spam).
 * Inicio, Reservas y el contador del menú comparten esta misma consulta.
 */
export function useBookings() {
  const { user } = useAuth()
  const providerId = user?.providerId
  return useQuery({
    queryKey: ["bookings", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Lead[]>>("/booking_list", {
        params: { from: isoDate(), to: isoDaysFromToday(60) },
      })
      return (data.data ?? []).map(normalizeLead)
    },
  })
}

/** Cambia el estado de una reserva al instante en pantalla y lo confirma con la API. */
export function useSetLeadStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: LeadStatus; silent?: boolean }) => {
      await api.post("/lead_update_status", { id, status })
    },
    onMutate: async ({ id, status }) => {
      const one = (l: Lead) => (l.id === id ? { ...l, status } : l)
      // Las listas vienen como Lead[] o como { rows, total } (admin, paginado).
      const patch = (d: unknown) =>
        Array.isArray(d) ? d.map(one) : d && typeof d === "object" && "rows" in d ? { ...d, rows: (d as { rows: Lead[] }).rows.map(one) } : d
      for (const key of [["bookings"], ["leads"]]) {
        await qc.cancelQueries({ queryKey: key })
        qc.setQueriesData({ queryKey: key }, patch)
      }
    },
    onSuccess: (_d, { status, silent }) => {
      if (!silent) toast.success(`Reserva marcada como “${LEAD_STATUS[status].label.toLowerCase()}”`)
    },
    onError: (err) => toast.error(apiErrorMessage(err, "No se pudo cambiar el estado")),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] })
      qc.invalidateQueries({ queryKey: ["leads"] })
      qc.invalidateQueries({ queryKey: ["admin-leads"] })
    },
  })
}
