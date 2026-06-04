"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  CalendarDays,
  ChevronLeft,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  User,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { api, apiErrorMessage } from "@/lib/api"
import { cn, formatDate } from "@/lib/utils"
import {
  mailtoLink,
  relativeTime,
  toWhatsAppDigits,
  whatsappLink,
} from "@/lib/leads"
import type { ApiResponse, Lead, LeadStatus, Vertical } from "@/types"

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  LEAD_STATUS_LABELS,
  LeadStatusBadge,
} from "@/components/leads/status-badge"

const VERTICAL_STYLES: Record<Vertical, string> = {
  fwt: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  adventure:
    "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  experience:
    "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  gastronomy: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
}

const DAYS_LONG = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
]

function copy(text: string, label = "Copiado") {
  if (typeof navigator === "undefined" || !navigator.clipboard) return
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success(label))
    .catch(() => toast.error("No se pudo copiar"))
}

export function LeadDetail({ id }: { id: number }) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Lead>>("/lead_get", {
        params: { id },
      })
      return data.data
    },
  })

  const updateStatus = useMutation({
    mutationFn: async (status: LeadStatus) => {
      await api.post<ApiResponse<unknown>>("/lead_update_status", {
        id,
        status,
      })
    },
    onSuccess: () => {
      toast.success("Estado actualizado")
      qc.invalidateQueries({ queryKey: ["lead", id] })
      qc.invalidateQueries({ queryKey: ["leads"] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  if (query.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  if (query.isError || !query.data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No se pudo cargar el lead</AlertTitle>
        <AlertDescription>
          {apiErrorMessage(query.error, "Lead no encontrado")}
        </AlertDescription>
      </Alert>
    )
  }

  const lead = query.data
  const wa = whatsappLink(lead)
  const mail = mailtoLink(lead)
  const providerWa =
    lead.whatsapp_e164 && toWhatsAppDigits(lead.whatsapp_e164)
      ? `https://wa.me/${toWhatsAppDigits(lead.whatsapp_e164)}`
      : null

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/leads"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ChevronLeft className="size-4" />
          Volver a leads
        </Link>
        <Select
          value={lead.status}
          onValueChange={(v) =>
            v && v !== lead.status && updateStatus.mutate(v as LeadStatus)
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Header */}
      <div className="bg-card rounded-lg border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <LeadStatusBadge status={lead.status} />
              {lead.vertical && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "capitalize",
                    VERTICAL_STYLES[lead.vertical]
                  )}
                >
                  {lead.vertical}
                </Badge>
              )}
              {lead.type && (
                <Badge variant="outline" className="capitalize">
                  {lead.type === "free" ? "Gratis/Gorra" : "Pago"}
                </Badge>
              )}
              <Badge variant="outline" className="uppercase">
                {lead.preferred_locale}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {lead.tourist_name}
            </h1>
            <p className="text-muted-foreground text-sm">
              Recibido{" "}
              <span title={lead.created_at}>
                {relativeTime(lead.created_at)}
              </span>{" "}
              · ID #{lead.id}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ size: "sm" })}
              >
                <MessageCircle className="size-4" />
                WhatsApp al turista
              </a>
            )}
            {mail && (
              <a
                href={mail}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Mail className="size-4" />
                Email
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Turista */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-4" />
              Turista
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row icon={<User className="size-4" />} label="Nombre">
              <span className="font-medium">{lead.tourist_name}</span>
              <CopyBtn value={lead.tourist_name} />
            </Row>
            <Row icon={<Phone className="size-4" />} label="Teléfono">
              <a
                href={`tel:${lead.tourist_phone}`}
                className="font-mono hover:underline"
              >
                {lead.tourist_phone}
              </a>
              <CopyBtn value={lead.tourist_phone} />
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({
                    variant: "ghost",
                    size: "icon-sm",
                  })}
                  title="WhatsApp"
                >
                  <MessageCircle className="size-3.5 text-emerald-600" />
                </a>
              )}
            </Row>
            {lead.tourist_email && (
              <Row icon={<Mail className="size-4" />} label="Email">
                <a
                  href={`mailto:${lead.tourist_email}`}
                  className="hover:underline"
                >
                  {lead.tourist_email}
                </a>
                <CopyBtn value={lead.tourist_email} />
              </Row>
            )}
            <Row icon={<Globe className="size-4" />} label="Idioma">
              <span className="uppercase">{lead.preferred_locale}</span>
            </Row>
          </CardContent>
        </Card>

        {/* Reserva */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4" />
              Reserva
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row icon={<CalendarDays className="size-4" />} label="Fecha">
              <span className="font-medium">
                {formatDate(lead.desired_date)}
              </span>
            </Row>
            {lead.desired_time && (
              <Row icon={<Clock className="size-4" />} label="Hora">
                <span className="font-mono">
                  {lead.desired_time.slice(0, 5)}
                </span>
              </Row>
            )}
            <Row icon={<Users className="size-4" />} label="Pax">
              <span className="font-medium tabular-nums">{lead.pax}</span>
            </Row>
            {lead.schedule_id != null && lead.day_of_week != null && (
              <Row
                icon={<Clock className="size-4" />}
                label="Horario elegido"
              >
                <span className="text-sm">
                  {DAYS_LONG[lead.day_of_week]}{" "}
                  {lead.schedule_time?.slice(0, 5)}
                  {lead.schedule_locale &&
                    ` · ${lead.schedule_locale.toUpperCase()}`}
                </span>
              </Row>
            )}
          </CardContent>
        </Card>

        {/* Mensaje */}
        {lead.message && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Mensaje del turista</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="bg-muted/40 whitespace-pre-wrap rounded-md border p-3 text-sm">
                {lead.message}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Experiencia y proveedor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Experiencia solicitada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/experiences/${lead.experience_id}`}
                  className="font-medium hover:underline"
                >
                  {lead.experience_title ?? `#${lead.experience_id}`}
                </Link>
                <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  {lead.experience_slug && (
                    <code className="bg-muted rounded px-1">
                      {lead.experience_slug}
                    </code>
                  )}
                  {lead.category && <span>· {lead.category}</span>}
                  {lead.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      {lead.city}
                    </span>
                  )}
                </p>
              </div>
              <Link
                href={`/experiences/${lead.experience_id}`}
                className={buttonVariants({
                  variant: "ghost",
                  size: "icon-sm",
                })}
                title="Ir a la experiencia"
              >
                <ExternalLink className="size-4" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proveedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/providers/${lead.provider_id}`}
                  className="font-medium hover:underline"
                >
                  {lead.provider_name ?? `#${lead.provider_id}`}
                </Link>
                {lead.provider_email && (
                  <p className="text-muted-foreground truncate text-xs">
                    {lead.provider_email}
                  </p>
                )}
                {lead.whatsapp_e164 && (
                  <p className="text-muted-foreground font-mono text-xs">
                    {lead.whatsapp_e164}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                {providerWa && (
                  <a
                    href={providerWa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({
                      variant: "ghost",
                      size: "icon-sm",
                    })}
                    title="WhatsApp al proveedor"
                  >
                    <MessageCircle className="size-4 text-emerald-600" />
                  </a>
                )}
                <Link
                  href={`/providers/${lead.provider_id}`}
                  className={buttonVariants({
                    variant: "ghost",
                    size: "icon-sm",
                  })}
                  title="Ir al proveedor"
                >
                  <ExternalLink className="size-4" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tracking */}
        {(lead.source ||
          lead.utm_source ||
          lead.utm_medium ||
          lead.utm_campaign ||
          lead.ip_address) && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Origen / tracking</CardTitle>
              <CardDescription>
                Datos de adquisición. Útiles para reportes y atribución.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {lead.source && <DL label="Source" value={lead.source} />}
                {lead.utm_source && (
                  <DL label="utm_source" value={lead.utm_source} />
                )}
                {lead.utm_medium && (
                  <DL label="utm_medium" value={lead.utm_medium} />
                )}
                {lead.utm_campaign && (
                  <DL label="utm_campaign" value={lead.utm_campaign} />
                )}
                {lead.ip_address && (
                  <DL label="IP" value={lead.ip_address} mono />
                )}
                {lead.user_agent && (
                  <DL
                    label="User-Agent"
                    value={lead.user_agent}
                    mono
                    full
                    truncate
                  />
                )}
              </dl>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground flex w-28 shrink-0 items-center gap-1.5 text-xs">
        {icon}
        {label}
      </span>
      <div className="flex flex-1 items-center gap-1.5 text-sm">{children}</div>
    </div>
  )
}

function CopyBtn({ value }: { value: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={() => copy(value)}
      title="Copiar"
    >
      <Copy className="size-3.5" />
    </Button>
  )
}

function DL({
  label,
  value,
  mono,
  full,
  truncate,
}: {
  label: string
  value: string
  mono?: boolean
  full?: boolean
  truncate?: boolean
}) {
  return (
    <div className={cn("space-y-0.5", full && "sm:col-span-2 lg:col-span-3")}>
      <dt className="text-muted-foreground text-[11px] uppercase tracking-wide">
        {label}
      </dt>
      <dd
        className={cn(
          "text-sm",
          mono && "font-mono",
          truncate && "truncate"
        )}
        title={truncate ? value : undefined}
      >
        {value}
      </dd>
    </div>
  )
}
