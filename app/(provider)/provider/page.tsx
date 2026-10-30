"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, ArrowRight, BellRing, ImageIcon, Plus } from "lucide-react"

import { api } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { cn, isoDate, longDay } from "@/lib/utils"
import type { ApiResponse, Experience, Provider, ProviderDashboardStats } from "@/types"

import { buttonVariants } from "@/components/ui/button"
import { EmptyState, ListSkeleton, PageHeader, SectionTitle } from "@/components/page"
import { Agenda } from "@/components/provider/booking"
import { isPending, useBookings } from "@/components/provider/queries"
import { experienceGaps } from "@/components/experiences/readiness"

export default function ProviderHomePage() {
  const { user } = useAuth()
  const providerId = user?.providerId
  const bookings = useBookings()

  const provider = useQuery({
    queryKey: ["provider", providerId],
    enabled: !!providerId,
    queryFn: async () =>
      (await api.get<ApiResponse<Provider>>("/provider_get", { params: { id: providerId } })).data.data,
  })
  const stats = useQuery({
    queryKey: ["provider-dashboard", providerId],
    enabled: !!providerId,
    queryFn: async () =>
      (await api.get<ApiResponse<ProviderDashboardStats>>("/provider_dashboard", { params: { id: providerId } })).data
        .data,
  })
  const experiences = useQuery({
    queryKey: ["experiences", "mine", providerId],
    enabled: !!providerId,
    queryFn: async () =>
      (await api.get<ApiResponse<Experience[]>>("/experience_list", { params: { limit: 50 } })).data.data ?? [],
  })

  const all = bookings.data ?? []
  const fresh = all.filter((l) => l.status === "new").length
  const pending = all.filter(isPending).length
  const week = all.filter((l) => l.status !== "lost" && l.status !== "spam")

  const firstName = provider.data?.contact_name?.split(" ")[0]
  const days = stats.data?.days_until_expire == null ? null : Number(stats.data.days_until_expire)

  return (
    <>
      <PageHeader
        title={firstName ? `Hola, ${firstName}` : "Hola"}
        description={<span className="first-letter:uppercase">{longDay(isoDate())}</span>}
      />

      <div className="space-y-3">
        {days !== null && days <= 15 && (
          <Link
            href="/provider/cuenta"
            className={cn(
              "flex items-center gap-3 rounded-xl border p-4 transition-colors",
              days < 0 ? "border-destructive/30 bg-destructive/5 hover:bg-destructive/10" : "border-highlight/40 bg-highlight-soft hover:brightness-[0.98]"
            )}
          >
            <AlertTriangle className={cn("size-5 shrink-0", days < 0 ? "text-destructive" : "text-highlight-foreground")} />
            <span className="flex-1 text-[0.9375rem]">
              {days < 0 ? (
                <><strong>Tu suscripción venció.</strong> Tus experiencias no se ven en el sitio.</>
              ) : (
                <><strong>Tu suscripción vence en {days} {days === 1 ? "día" : "días"}.</strong> Renová para seguir apareciendo.</>
              )}
            </span>
            <ArrowRight className="text-muted-foreground size-4" />
          </Link>
        )}

        {pending > 0 && (
          <Link
            href="/provider/reservas?vista=pendientes"
            className="bg-primary text-primary-foreground group flex items-center gap-4 rounded-xl p-4 shadow-sm transition-colors hover:bg-primary/95 sm:p-5"
          >
            <span className="bg-primary-foreground/15 flex size-11 shrink-0 items-center justify-center rounded-full">
              <BellRing className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block text-lg font-semibold">
                {pending} {pending === 1 ? "reserva" : "reservas"} por confirmar
              </span>
              <span className="text-primary-foreground/80 block text-sm">
                {fresh > 0
                  ? `${fresh === 1 ? "Una es nueva" : `${fresh} son nuevas`}: respondé hoy, quien no recibe respuesta suele reservar en otro lado.`
                  : "Ya les escribiste: marcá cada una cuando te confirme."}
              </span>
            </span>
            <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>

      <section className="mt-8">
        <SectionTitle
          title="Próximas salidas"
          action={
            week.length > 0 && (
              <Link href="/provider/reservas?vista=proximas" className="text-primary text-sm font-medium hover:underline">
                Ver agenda
              </Link>
            )
          }
        />
        {bookings.isLoading ? <ListSkeleton rows={2} /> : <Agenda leads={week} limitDays={3} />}
      </section>

      <section className="mt-10">
        <SectionTitle
          title="Tus experiencias"
          action={
            <Link href="/provider/experiencias/new" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Plus />
              Nueva
            </Link>
          }
        />
        {experiences.isLoading ? (
          <ListSkeleton rows={2} />
        ) : !experiences.data?.length ? (
          <EmptyState
            icon={ImageIcon}
            title="Todavía no cargaste experiencias"
            action={
              <Link href="/provider/experiencias/new" className={buttonVariants()}>
                <Plus />
                Crear mi primera experiencia
              </Link>
            }
          >
            Te lleva 5 minutos: nombre, fotos, horarios y listo.
          </EmptyState>
        ) : (
          <ul className="bg-card divide-y rounded-xl border">
            {experiences.data.map((e) => {
              const gaps = experienceGaps(e)
              const visible = Number(e.is_active) === 1
              return (
                <li key={e.id}>
                  <Link href={`/provider/experiencias/${e.id}`} className="hover:bg-muted/50 flex items-center gap-3 p-3 transition-colors sm:px-4">
                    <span className="bg-muted relative size-12 shrink-0 overflow-hidden rounded-lg">
                      {e.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.cover_image} alt="" className="size-full object-cover" />
                      ) : (
                        <ImageIcon className="text-muted-foreground absolute inset-0 m-auto size-5" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{e.title}</span>
                      <span className={cn("block text-sm", gaps.length ? "text-highlight-foreground" : "text-muted-foreground")}>
                        {gaps.length
                          ? `Le falta: ${gaps.join(", ").toLowerCase()}`
                          : visible
                            ? "Visible en el sitio"
                            : "Lista, pero oculta"}
                      </span>
                    </span>
                    <ArrowRight className="text-muted-foreground size-4 shrink-0" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
