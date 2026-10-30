"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CalendarOff, CalendarPlus, Loader2, Pencil, Plus, Trash2, Users } from "lucide-react"
import { toast } from "sonner"

import { api, apiErrorMessage } from "@/lib/api"
import { DAY_LONG, DAY_SHORT, LOCALES, LOCALE_LABEL, WEEK_ORDER } from "@/lib/labels"
import { cn, formatDate } from "@/lib/utils"
import type { ExperienceSchedule, Locale } from "@/types"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Chip } from "@/components/ui/chip"
import { Input } from "@/components/ui/input"
import { useBlackouts, useSchedules } from "@/components/experiences/queries"

/*
 * En la DB hay una fila por día (experience_schedules). Para el usuario,
 * una "salida" es hora + idioma + cupo + temporada, con varios días:
 * acá se agrupan las filas así y se editan juntas.
 */

interface Departure {
  key: string
  time: string // "10:30"
  locale: Locale
  capacity: number | null
  valid_from: string | null
  valid_to: string | null
  byDay: Map<number, ExperienceSchedule>
}

interface DepDraft {
  time: string
  locale: Locale
  days: number[]
  capacity: string
  seasonal: boolean
  valid_from: string
  valid_to: string
}

const localeRank = (l: Locale) => LOCALES.findIndex((x) => x.value === l)

function groupDepartures(rows: ExperienceSchedule[]): Departure[] {
  const map = new Map<string, Departure>()
  for (const r of rows) {
    const time = r.start_time.slice(0, 5)
    const key = [time, r.locale, r.capacity_hint ?? "", r.valid_from ?? "", r.valid_to ?? ""].join("|")
    let d = map.get(key)
    if (!d) {
      d = {
        key,
        time,
        locale: r.locale,
        capacity: r.capacity_hint,
        valid_from: r.valid_from,
        valid_to: r.valid_to,
        byDay: new Map(),
      }
      map.set(key, d)
    }
    d.byDay.set(r.day_of_week, r)
  }
  return [...map.values()].sort(
    (a, b) => a.time.localeCompare(b.time) || localeRank(a.locale) - localeRank(b.locale)
  )
}

function listJoin(items: string[]): string {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`
}

/** "2026-12-25" -> "Viernes 25 de diciembre" */
function longDate(iso: string): string {
  const s = new Date(iso + "T00:00:00").toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
  return s.charAt(0).toUpperCase() + s.slice(1).replace(",", "")
}

export function SchedulesTab({
  experienceId,
  maxPax,
}: {
  experienceId: number
  maxPax: number
}) {
  const qc = useQueryClient()
  const list = useSchedules(experienceId)
  const [editing, setEditing] = React.useState<string | null>(null) // key | "new" | null

  const departures = React.useMemo(() => groupDepartures(list.data ?? []), [list.data])
  const locales = [...new Set(departures.map((d) => d.locale))].sort(
    (a, b) => localeRank(a) - localeRank(b)
  )
  const perWeek = list.data?.length ?? 0

  const save = useMutation({
    mutationFn: async ({ dep, d }: { dep?: Departure; d: DepDraft }) => {
      const params = {
        start_time: `${d.time}:00`,
        locale: d.locale,
        capacity_hint: d.capacity === "" ? null : Number(d.capacity),
        valid_from: d.seasonal && d.valid_from ? d.valid_from : null,
        valid_to: d.seasonal && d.valid_to ? d.valid_to : null,
      }
      const ops: Promise<unknown>[] = []
      for (const [day, row] of dep?.byDay ?? []) {
        ops.push(
          d.days.includes(day)
            ? api.post("/schedule_update", { id: row.id, day_of_week: day, ...params })
            : api.post("/schedule_delete", { id: row.id })
        )
      }
      for (const day of d.days) {
        if (!dep?.byDay.has(day)) {
          ops.push(api.post("/schedule_add", { experience_id: experienceId, day_of_week: day, ...params }))
        }
      }
      await Promise.all(ops)
    },
    onSuccess: (_, { dep }) => {
      toast.success(dep ? "Salida actualizada" : "Salida agregada")
      setEditing(null)
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
    onSettled: () => qc.invalidateQueries({ queryKey: ["schedules", experienceId] }),
  })

  const removeDeparture = useMutation({
    mutationFn: (dep: Departure) =>
      Promise.all([...dep.byDay.values()].map((r) => api.post("/schedule_delete", { id: r.id }))),
    onSuccess: () => toast.success("Salida eliminada"),
    onError: (err) => toast.error(apiErrorMessage(err)),
    onSettled: () => qc.invalidateQueries({ queryKey: ["schedules", experienceId] }),
  })

  /** La DB no admite dos salidas el mismo día, a la misma hora y en el mismo idioma. */
  const conflictFor = (d: DepDraft, self?: Departure): string | null => {
    for (const other of departures) {
      if (other.key === self?.key || other.time !== d.time || other.locale !== d.locale) continue
      const day = d.days.find((x) => other.byDay.has(x))
      if (day !== undefined) {
        return `Ya hay una salida a las ${d.time} en ${LOCALE_LABEL[d.locale].toLowerCase()} el ${DAY_LONG[day].toLowerCase()}.`
      }
    }
    return null
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Salidas de cada semana
            {(list.isFetching || save.isPending || removeDeparture.isPending) && (
              <Loader2 className="text-muted-foreground size-4 animate-spin" />
            )}
          </CardTitle>
          <CardDescription>
            {departures.length > 0 ? (
              <>
                Se ofrece en <strong className="text-foreground">{listJoin(locales.map((l) => LOCALE_LABEL[l].toLowerCase()))}</strong>
                {" · "}
                {perWeek} salida{perWeek === 1 ? "" : "s"} por semana. Los idiomas del tour salen de acá.
              </>
            ) : (
              "Cargá cuándo sale el tour: la hora, el idioma y qué días. El turista solo puede reservar en estas salidas."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {list.isError && (
            <Alert variant="destructive">
              <AlertDescription>{apiErrorMessage(list.error)}</AlertDescription>
            </Alert>
          )}

          {list.isLoading ? (
            <div className="h-24 animate-pulse rounded-md border bg-muted/40" />
          ) : (
            departures.map((dep) =>
              editing === dep.key ? (
                <DepartureForm
                  key={dep.key}
                  initial={{
                    time: dep.time,
                    locale: dep.locale,
                    days: [...dep.byDay.keys()],
                    capacity: dep.capacity != null ? String(dep.capacity) : "",
                    seasonal: !!(dep.valid_from || dep.valid_to),
                    valid_from: dep.valid_from ?? "",
                    valid_to: dep.valid_to ?? "",
                  }}
                  saving={save.isPending}
                  submitLabel="Guardar cambios"
                  conflict={(d) => conflictFor(d, dep)}
                  onCancel={() => setEditing(null)}
                  onSubmit={(d) => save.mutate({ dep, d })}
                />
              ) : (
                <DepartureRow
                  key={dep.key}
                  dep={dep}
                  disabled={editing !== null}
                  onEdit={() => setEditing(dep.key)}
                  onRemove={() => {
                    const n = dep.byDay.size
                    if (confirm(`¿Eliminar la salida de las ${dep.time} en ${LOCALE_LABEL[dep.locale].toLowerCase()} (${n} día${n === 1 ? "" : "s"})?`))
                      removeDeparture.mutate(dep)
                  }}
                />
              )
            )
          )}

          {editing === "new" ? (
            <DepartureForm
              initial={{
                time: "10:00",
                locale: "es",
                days: [],
                capacity: String(maxPax || ""),
                seasonal: false,
                valid_from: "",
                valid_to: "",
              }}
              saving={save.isPending}
              submitLabel="Agregar salida"
              conflict={(d) => conflictFor(d)}
              onCancel={() => setEditing(null)}
              onSubmit={(d) => save.mutate({ d })}
            />
          ) : (
            !list.isLoading && (
              <Button
                variant={departures.length === 0 ? "default" : "outline"}
                disabled={editing !== null}
                onClick={() => setEditing("new")}
              >
                <Plus />
                {departures.length === 0 ? "Agregar la primera salida" : "Agregar otra salida"}
              </Button>
            )
          )}
        </CardContent>
      </Card>

      <BlackoutsCard experienceId={experienceId} />
    </div>
  )
}

function DayPills({ days }: { days: Set<number> | number[] }) {
  const on = new Set(days)
  return (
    <div className="flex gap-1">
      {WEEK_ORDER.map((d) => (
        <span
          key={d}
          title={DAY_LONG[d]}
          aria-label={`${DAY_LONG[d]}: ${on.has(d) ? "sí" : "no"}`}
          className={cn(
            "flex h-7 w-10 items-center justify-center rounded-md text-xs font-medium",
            on.has(d) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground/60"
          )}
        >
          {DAY_SHORT[d]}
        </span>
      ))}
    </div>
  )
}

function DepartureRow({
  dep,
  disabled,
  onEdit,
  onRemove,
}: {
  dep: Departure
  disabled: boolean
  onEdit: () => void
  onRemove: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border p-3">
      <div className="w-20">
        <div className="text-xl font-semibold tabular-nums leading-none">{dep.time}</div>
        <div className="text-muted-foreground mt-1 text-xs">{LOCALE_LABEL[dep.locale]}</div>
      </div>
      <div className="space-y-1.5">
        <DayPills days={[...dep.byDay.keys()]} />
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 text-xs">
          <span className="flex items-center gap-1">
            <Users className="size-3" />
            {dep.capacity != null ? `${dep.capacity} lugares` : "Sin límite de lugares"}
          </span>
          {(dep.valid_from || dep.valid_to) && (
            <span>
              Temporada: {dep.valid_from ? formatDate(dep.valid_from) : "…"} →{" "}
              {dep.valid_to ? formatDate(dep.valid_to) : "…"}
            </span>
          )}
        </p>
      </div>
      <div className="ml-auto flex gap-1">
        <Button variant="ghost" size="sm" disabled={disabled} onClick={onEdit}>
          <Pencil />
          Editar
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Eliminar salida" disabled={disabled} onClick={onRemove}>
          <Trash2 />
        </Button>
      </div>
    </div>
  )
}

const DAY_PRESETS: { label: string; days: number[] }[] = [
  { label: "Todos los días", days: [0, 1, 2, 3, 4, 5, 6] },
  { label: "Lunes a viernes", days: [1, 2, 3, 4, 5] },
  { label: "Fines de semana", days: [6, 0] },
]

function DepartureForm({
  initial,
  saving,
  submitLabel,
  conflict,
  onCancel,
  onSubmit,
}: {
  initial: DepDraft
  saving: boolean
  submitLabel: string
  conflict: (d: DepDraft) => string | null
  onCancel: () => void
  onSubmit: (d: DepDraft) => void
}) {
  const [d, setD] = React.useState(initial)
  const set = (patch: Partial<DepDraft>) => setD((prev) => ({ ...prev, ...patch }))
  const toggleDay = (day: number) =>
    set({ days: d.days.includes(day) ? d.days.filter((x) => x !== day) : [...d.days, day] })

  const cap = Number(d.capacity)
  const error =
    !/^\d{2}:\d{2}$/.test(d.time)
      ? "Poné la hora de salida."
      : d.days.length === 0
        ? "Elegí al menos un día."
        : d.capacity !== "" && (!Number.isInteger(cap) || cap < 1 || cap > 255)
          ? "El cupo va de 1 a 255 lugares (o vacío = sin límite)."
          : d.seasonal && d.valid_from && d.valid_to && d.valid_to < d.valid_from
            ? "La temporada termina antes de empezar."
            : conflict(d)

  return (
    <form
      className="bg-muted/30 space-y-4 rounded-lg border border-primary/40 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!error) onSubmit(d)
      }}
    >
      <div className="flex flex-wrap gap-x-6 gap-y-4">
        <label className="grid gap-1.5 text-sm font-medium">
          Hora de salida
          <Input type="time" step={300} className="w-32" value={d.time} onChange={(e) => set({ time: e.target.value })} />
        </label>
        <div className="grid gap-1.5">
          <span className="text-sm font-medium">Idioma del guía</span>
          <div className="flex gap-1.5">
            {LOCALES.map((l) => (
              <Chip key={l.value} active={d.locale === l.value} onClick={() => set({ locale: l.value })}>
                {l.label}
              </Chip>
            ))}
          </div>
        </div>
        <label className="grid gap-1.5 text-sm font-medium">
          Cupo
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={255}
              className="w-20"
              placeholder="∞"
              value={d.capacity}
              onChange={(e) => set({ capacity: e.target.value })}
            />
            <span className="text-muted-foreground text-xs font-normal">lugares</span>
          </div>
        </label>
      </div>

      <div className="grid gap-1.5">
        <span className="text-sm font-medium">Días</span>
        <div className="flex flex-wrap gap-1.5">
          {WEEK_ORDER.map((day) => (
            <Chip key={day} active={d.days.includes(day)} className="w-14" onClick={() => toggleDay(day)}>
              {DAY_SHORT[day]}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 text-xs">
          {DAY_PRESETS.map((p) => (
            <button key={p.label} type="button" className="text-primary hover:underline" onClick={() => set({ days: p.days })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-primary size-4"
            checked={d.seasonal}
            onChange={(e) => set({ seasonal: e.target.checked })}
          />
          Solo durante una temporada
        </label>
        {d.seasonal && (
          <div className="flex flex-wrap items-center gap-2 pl-6 text-sm">
            desde
            <Input type="date" className="w-40" value={d.valid_from} onChange={(e) => set({ valid_from: e.target.value })} />
            hasta
            <Input type="date" className="w-40" value={d.valid_to} onChange={(e) => set({ valid_to: e.target.value })} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
        {error && d !== initial && <p className="text-destructive mr-auto text-sm">{error}</p>}
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!!error || saving}>
          {saving && <Loader2 className="animate-spin" />}
          {submitLabel}
          {d.days.length > 0 && ` · ${d.days.length} día${d.days.length === 1 ? "" : "s"}`}
        </Button>
      </div>
    </form>
  )
}

function BlackoutsCard({ experienceId }: { experienceId: number }) {
  const qc = useQueryClient()
  const list = useBlackouts(experienceId)
  const [date, setDate] = React.useState("")
  const [reason, setReason] = React.useState("")
  const today = new Date().toLocaleDateString("en-CA") // YYYY-MM-DD local
  const refresh = () => qc.invalidateQueries({ queryKey: ["blackouts", experienceId] })

  const add = useMutation({
    mutationFn: () =>
      api.post("/blackout_add", { experience_id: experienceId, blackout_date: date, reason: reason.trim() || null }),
    onSuccess: () => {
      setDate("")
      setReason("")
      refresh()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })
  const remove = useMutation({
    mutationFn: (id: number) => api.post("/blackout_delete", { id }),
    onSuccess: refresh,
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const items = (list.data ?? []).slice().sort((a, b) => a.blackout_date.localeCompare(b.blackout_date))
  const taken = items.some((b) => b.blackout_date === date)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarOff className="size-4" />
          Días sin salidas
        </CardTitle>
        <CardDescription>
          Feriados, vacaciones o días que no vas a trabajar. Ese día no se puede reservar ninguna salida.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (date && !taken) add.mutate()
          }}
        >
          <Input type="date" min={today} className="w-40" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input
            className="min-w-48 flex-1"
            maxLength={180}
            placeholder="Motivo (opcional, solo lo ves vos)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button type="submit" variant="outline" disabled={!date || taken || add.isPending}>
            {add.isPending ? <Loader2 className="animate-spin" /> : <CalendarPlus />}
            {taken ? "Ya está cargado" : "Agregar día"}
          </Button>
        </form>

        {list.isError ? (
          <Alert variant="destructive">
            <AlertDescription>{apiErrorMessage(list.error)}</AlertDescription>
          </Alert>
        ) : items.length > 0 ? (
          <ul className="divide-y rounded-md border">
            {items.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="font-medium">{longDate(b.blackout_date)}</span>
                {b.reason && <span className="text-muted-foreground truncate">· {b.reason}</span>}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="ml-auto"
                  aria-label="Quitar día"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(b.id)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          !list.isLoading && <p className="text-muted-foreground text-sm">No hay días bloqueados.</p>
        )}
      </CardContent>
    </Card>
  )
}
