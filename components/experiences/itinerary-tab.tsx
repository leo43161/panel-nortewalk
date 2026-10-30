"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { api, apiErrorMessage } from "@/lib/api"
import { formatDuration } from "@/lib/utils"
import type { ExperienceItineraryStep } from "@/types"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useItinerary } from "@/components/experiences/queries"

type Draft = { title: string; description: string; duration_min: string }

const toDraft = (s?: ExperienceItineraryStep): Draft => ({
  title: s?.title ?? "",
  description: s?.description ?? "",
  duration_min: s?.duration_min != null ? String(s.duration_min) : "",
})

export function ItineraryTab({
  experienceId,
  totalDuration,
}: {
  experienceId: number
  totalDuration: number
}) {
  const qc = useQueryClient()
  const list = useItinerary(experienceId)
  const [adding, setAdding] = React.useState(false)
  const refresh = () => qc.invalidateQueries({ queryKey: ["itinerary", experienceId] })
  const onError = (err: unknown) => toast.error(apiErrorMessage(err))

  const steps = (list.data ?? []).slice().sort((a, b) => a.step_order - b.step_order)
  const stepsMinutes = steps.reduce((sum, s) => sum + (s.duration_min ?? 0), 0)

  const payload = (s: ExperienceItineraryStep, d: Draft, step_order = s.step_order) => ({
    id: s.id,
    step_order,
    title: d.title.trim(),
    description: d.description.trim() || null,
    duration_min: d.duration_min === "" ? null : Number(d.duration_min),
  })

  const add = useMutation({
    mutationFn: (d: Draft) =>
      api.post("/itinerary_add", {
        experience_id: experienceId,
        step_order: steps.reduce((m, s) => Math.max(m, s.step_order), 0) + 1,
        title: d.title.trim(),
        description: d.description.trim() || null,
        duration_min: d.duration_min === "" ? null : Number(d.duration_min),
      }),
    onSuccess: () => {
      setAdding(false)
      refresh()
    },
    onError,
  })

  const save = useMutation({
    mutationFn: ({ step, draft }: { step: ExperienceItineraryStep; draft: Draft }) =>
      api.post("/itinerary_update", payload(step, draft)),
    onSuccess: refresh,
    onError,
  })

  // (experiencia, orden) es único en la DB: el intercambio pasa por un orden 0 temporal.
  const swap = useMutation({
    mutationFn: async ([a, b]: [ExperienceItineraryStep, ExperienceItineraryStep]) => {
      await api.post("/itinerary_update", payload(a, toDraft(a), 0))
      await api.post("/itinerary_update", payload(b, toDraft(b), a.step_order))
      await api.post("/itinerary_update", payload(a, toDraft(a), b.step_order))
    },
    onSettled: refresh,
    onError,
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.post("/itinerary_delete", { id }),
    onSuccess: refresh,
    onError,
  })

  const busy = add.isPending || save.isPending || swap.isPending || remove.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Recorrido
          {(busy || list.isFetching) && (
            <Loader2 className="text-muted-foreground size-4 animate-spin" />
          )}
        </CardTitle>
        <CardDescription>
          Las paradas en el orden en que se hacen. Es opcional, pero ayuda mucho a
          que el turista se imagine la experiencia.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {list.isError && (
          <Alert variant="destructive">
            <AlertDescription>{apiErrorMessage(list.error)}</AlertDescription>
          </Alert>
        )}

        {list.isLoading ? (
          <div className="h-24 animate-pulse rounded-md border bg-muted/40" />
        ) : steps.length === 0 && !adding ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed py-10 text-center">
            <MapPin className="text-muted-foreground size-8" />
            <p className="text-muted-foreground max-w-sm text-sm">
              Todavía no cargaste paradas. Ej: “Plaza Independencia”, “Casa Histórica”,
              “Mercado del Norte”.
            </p>
            <Button onClick={() => setAdding(true)}>
              <Plus />
              Agregar la primera parada
            </Button>
          </div>
        ) : (
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <StepItem
                key={`${s.id}-${s.step_order}-${s.title}`}
                number={i + 1}
                step={s}
                first={i === 0}
                last={i === steps.length - 1}
                busy={busy}
                onSave={(draft) => save.mutateAsync({ step: s, draft })}
                onMove={(dir) => swap.mutate([s, steps[i + dir]])}
                onRemove={() => {
                  if (confirm(`¿Eliminar la parada “${s.title}”?`)) remove.mutate(s.id)
                }}
              />
            ))}
            {adding && (
              <li className="flex gap-3">
                <StepNumber n={steps.length + 1} />
                <StepEditor
                  initial={toDraft()}
                  saving={add.isPending}
                  submitLabel="Agregar parada"
                  onCancel={() => setAdding(false)}
                  onSubmit={(d) => add.mutate(d)}
                />
              </li>
            )}
          </ol>
        )}

        {steps.length > 0 && !adding && (
          <div className="flex flex-wrap items-center justify-between gap-2 pl-10">
            <Button variant="outline" onClick={() => setAdding(true)}>
              <Plus />
              Agregar parada
            </Button>
            {stepsMinutes > 0 && (
              <p className="text-muted-foreground text-xs">
                Suma de paradas: {formatDuration(stepsMinutes)} · la experiencia dura{" "}
                {formatDuration(totalDuration)}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="bg-primary text-primary-foreground mt-2 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
      {n}
    </span>
  )
}

function StepItem({
  number,
  step,
  first,
  last,
  busy,
  onSave,
  onMove,
  onRemove,
}: {
  number: number
  step: ExperienceItineraryStep
  first: boolean
  last: boolean
  busy: boolean
  onSave: (d: Draft) => Promise<unknown>
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  return (
    <li className="flex gap-3">
      <StepNumber n={number} />
      {editing ? (
        <StepEditor
          initial={toDraft(step)}
          saving={saving}
          submitLabel="Guardar"
          onCancel={() => setEditing(false)}
          onSubmit={async (d) => {
            setSaving(true)
            try {
              await onSave(d)
              setEditing(false)
            } finally {
              setSaving(false)
            }
          }}
        />
      ) : (
        <div className="group bg-card flex flex-1 items-start gap-2 rounded-lg border p-3">
          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditing(true)}>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <h4 className="font-medium">{step.title}</h4>
              {step.duration_min != null && step.duration_min > 0 && (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Clock className="size-3" />
                  {formatDuration(step.duration_min)}
                </span>
              )}
            </div>
            {step.description && (
              <p className="text-muted-foreground mt-1 text-sm whitespace-pre-line">
                {step.description}
              </p>
            )}
          </button>
          <div className="flex shrink-0 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
            <Button variant="ghost" size="icon-xs" aria-label="Subir" disabled={first || busy} onClick={() => onMove(-1)}>
              <ArrowUp />
            </Button>
            <Button variant="ghost" size="icon-xs" aria-label="Bajar" disabled={last || busy} onClick={() => onMove(1)}>
              <ArrowDown />
            </Button>
            <Button variant="ghost" size="icon-xs" aria-label="Editar" onClick={() => setEditing(true)}>
              <Pencil />
            </Button>
            <Button variant="ghost" size="icon-xs" aria-label="Eliminar" disabled={busy} onClick={onRemove}>
              <Trash2 />
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}

function StepEditor({
  initial,
  saving,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  initial: Draft
  saving: boolean
  submitLabel: string
  onCancel: () => void
  onSubmit: (d: Draft) => void
}) {
  const [d, setD] = React.useState(initial)
  const valid = d.title.trim().length >= 2

  return (
    <form
      className="bg-muted/30 flex-1 space-y-3 rounded-lg border p-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSubmit(d)
      }}
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <label className="grid gap-1.5 text-sm font-medium">
          Nombre de la parada
          <Input
            autoFocus
            maxLength={180}
            value={d.title}
            placeholder="Ej: Casa Histórica de la Independencia"
            onChange={(e) => setD({ ...d, title: e.target.value })}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Minutos (opcional)
          <Input
            type="number"
            min={0}
            step={5}
            value={d.duration_min}
            placeholder="30"
            onChange={(e) => setD({ ...d, duration_min: e.target.value })}
          />
        </label>
      </div>
      <label className="grid gap-1.5 text-sm font-medium">
        Qué se hace ahí (opcional)
        <Textarea
          rows={2}
          value={d.description}
          placeholder="Ej: La casa donde se declaró la independencia en 1816 y sus mitos."
          onChange={(e) => setD({ ...d, description: e.target.value })}
        />
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!valid || saving}>
          {saving && <Loader2 className="animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
