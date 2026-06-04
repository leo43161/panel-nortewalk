"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, MessageCircle, Phone } from "lucide-react"
import { toast } from "sonner"

import { api, apiErrorMessage } from "@/lib/api"
import { whatsappLink } from "@/lib/leads"
import { cn } from "@/lib/utils"
import type { ApiResponse, Lead, LeadStatus } from "@/types"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LeadStatusBadge } from "@/components/leads/status-badge"

const NEXT_STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "Nuevo" },
  { value: "contacted", label: "Contactado" },
  { value: "confirmed", label: "Confirmar reserva" },
  { value: "attended", label: "Asistió" },
  { value: "no_show", label: "No asistió" },
  { value: "lost", label: "Perdido" },
  { value: "spam", label: "Spam" },
]

interface LeadRowProps {
  lead: Lead
  compact?: boolean
}

export function LeadRow({ lead, compact = false }: LeadRowProps) {
  const qc = useQueryClient()
  const wa = whatsappLink(lead)

  const update = useMutation({
    mutationFn: async (status: LeadStatus) => {
      await api.post<ApiResponse<null>>("/lead_update_status", {
        id: lead.id,
        status,
      })
      return status
    },
    onSuccess: (status) => {
      toast.success(`Estado actualizado a "${status}"`)
      qc.invalidateQueries({ queryKey: ["provider-leads"] })
      qc.invalidateQueries({ queryKey: ["provider-new-leads"] })
      qc.invalidateQueries({ queryKey: ["provider-upcoming"] })
      qc.invalidateQueries({ queryKey: ["provider-dashboard"] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  return (
    <div
      className={cn(
        "bg-card flex flex-col gap-3 rounded-md border p-3",
        compact && "p-2"
      )}
    >
      {/* línea superior: nombre + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium leading-tight">{lead.tourist_name}</span>
            <LeadStatusBadge status={lead.status} />
          </div>
          <p className="text-muted-foreground text-xs">
            {lead.experience_title}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums">
            {lead.desired_date}
            {lead.desired_time && (
              <span className="text-muted-foreground ml-1 font-normal">
                {lead.desired_time.slice(0, 5)}
              </span>
            )}
          </p>
          <p className="text-muted-foreground text-xs">{lead.pax} pax</p>
        </div>
      </div>

      {/* mensaje del turista */}
      {lead.message && !compact && (
        <p className="text-muted-foreground bg-muted/30 line-clamp-3 rounded p-2 text-xs italic">
          &ldquo;{lead.message}&rdquo;
        </p>
      )}

      {/* acciones */}
      <div className="flex flex-wrap items-center gap-2">
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener"
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-green-600 hover:bg-green-700 text-white"
            )}
          >
            <MessageCircle className="size-4" />
            WhatsApp
          </a>
        )}
        <a
          href={`tel:${lead.tourist_phone}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Phone className="size-4" />
          Llamar
        </a>

        <div className="ml-auto flex items-center gap-2">
          {update.isPending && (
            <Loader2 className="text-muted-foreground size-4 animate-spin" />
          )}
          <Select
            value={lead.status}
            onValueChange={(v) => v && update.mutate(v as LeadStatus)}
            disabled={update.isPending}
          >
            <SelectTrigger size="sm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NEXT_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
