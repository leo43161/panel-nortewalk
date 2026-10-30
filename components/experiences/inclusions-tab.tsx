"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowDown, ArrowUp, Check, Loader2, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { api, apiErrorMessage } from "@/lib/api"
import { INCLUSION_SUGGESTIONS } from "@/lib/labels"
import { cn } from "@/lib/utils"
import type { ExperienceInclusion, InclusionKind } from "@/types"

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
import { useInclusions } from "@/components/experiences/queries"

export function InclusionsTab({ experienceId }: { experienceId: number }) {
  const qc = useQueryClient()
  const list = useInclusions(experienceId)
  const refresh = () => qc.invalidateQueries({ queryKey: ["inclusions", experienceId] })
  const onError = (err: unknown) => toast.error(apiErrorMessage(err))

  const add = useMutation({
    mutationFn: (v: { text: string; kind: InclusionKind; sort_order: number }) =>
      api.post("/inclusion_add", { experience_id: experienceId, ...v }),
    onSuccess: refresh,
    onError,
  })
  // El SP pisa texto, tipo y orden: siempre se manda la fila completa.
  const update = useMutation({
    mutationFn: (rows: ExperienceInclusion[]) =>
      Promise.all(
        rows.map((r) =>
          api.post("/inclusion_update", {
            id: r.id,
            text: r.text,
            kind: r.kind,
            sort_order: r.sort_order,
          })
        )
      ),
    onSuccess: refresh,
    onError,
  })
  const remove = useMutation({
    mutationFn: (id: number) => api.post("/inclusion_delete", { id }),
    onSuccess: refresh,
    onError,
  })

  const busy = add.isPending || update.isPending || remove.isPending || list.isFetching
  const byKind = (kind: InclusionKind) =>
    (list.data ?? [])
      .filter((i) => i.kind === kind)
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Qué incluye y qué no
          {busy && <Loader2 className="text-muted-foreground size-4 animate-spin" />}
        </CardTitle>
        <CardDescription>
          Así el turista sabe qué esperar y qué llevar. Escribí y apretá Enter, o
          tocá una sugerencia. Para corregir un ítem, hacé click sobre el texto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {list.isError ? (
          <Alert variant="destructive">
            <AlertDescription>{apiErrorMessage(list.error)}</AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            {(["included", "excluded"] as const).map((kind) => {
              const items = byKind(kind)
              return (
                <KindColumn
                  key={kind}
                  kind={kind}
                  items={items}
                  loading={list.isLoading}
                  busy={busy}
                  onAdd={(text) =>
                    add.mutate({
                      text,
                      kind,
                      sort_order: items.reduce((m, i) => Math.max(m, i.sort_order + 1), 0),
                    })
                  }
                  onUpdate={(rows) => update.mutate(rows)}
                  onRemove={(id) => remove.mutate(id)}
                />
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function KindColumn({
  kind,
  items,
  loading,
  busy,
  onAdd,
  onUpdate,
  onRemove,
}: {
  kind: InclusionKind
  items: ExperienceInclusion[]
  loading: boolean
  busy: boolean
  onAdd: (text: string) => void
  onUpdate: (rows: ExperienceInclusion[]) => void
  onRemove: (id: number) => void
}) {
  const [draft, setDraft] = React.useState("")
  const included = kind === "included"
  const Icon = included ? Check : X
  const taken = new Set(items.map((i) => i.text.trim().toLowerCase()))
  const suggestions = INCLUSION_SUGGESTIONS[kind].filter((s) => !taken.has(s.toLowerCase()))

  const submit = (text: string) => {
    const t = text.trim()
    if (t.length < 2) return
    onAdd(t)
    setDraft("")
  }

  /** Renumera la columna y manda solo las filas cuyo orden cambió. */
  const move = (index: number, dir: -1 | 1) => {
    const next = [...items]
    const [it] = next.splice(index, 1)
    next.splice(index + dir, 0, it)
    onUpdate(
      next
        .map((r, i) => ({ ...r, sort_order: i }))
        .filter((r, i) => r.id !== items[i]?.id || r.sort_order !== items[i].sort_order)
    )
  }

  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 font-medium">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full",
            included
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
          )}
        >
          <Icon className="size-3.5" />
        </span>
        {included ? "Incluye" : "No incluye"}
        <span className="text-muted-foreground text-xs font-normal">{items.length}</span>
      </h3>

      {loading ? (
        <div className="h-20 animate-pulse rounded-md border bg-muted/40" />
      ) : items.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-sm">
          Todavía nada.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {items.map((item, i) => (
            <InclusionRow
              key={`${item.id}-${item.text}`}
              item={item}
              first={i === 0}
              last={i === items.length - 1}
              busy={busy}
              onSave={(text) => onUpdate([{ ...item, text }])}
              onMove={(dir) => move(i, dir)}
              onRemove={() => onRemove(item.id)}
            />
          ))}
        </ul>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit(draft)
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={255}
          placeholder={included ? "Ej: Mate con tortillas" : "Ej: Traslado desde el hotel"}
        />
        <Button type="submit" variant="outline" disabled={draft.trim().length < 2 || busy}>
          <Plus />
          Agregar
        </Button>
      </form>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <Chip
              key={s}
              disabled={busy}
              className="h-7 border-dashed px-2.5 text-xs"
              onClick={() => submit(s)}
            >
              <Plus className="size-3" />
              {s}
            </Chip>
          ))}
        </div>
      )}
    </section>
  )
}

function InclusionRow({
  item,
  first,
  last,
  busy,
  onSave,
  onMove,
  onRemove,
}: {
  item: ExperienceInclusion
  first: boolean
  last: boolean
  busy: boolean
  onSave: (text: string) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [text, setText] = React.useState(item.text)

  const commit = () => {
    setEditing(false)
    const t = text.trim()
    if (t.length >= 2 && t !== item.text) onSave(t)
    else setText(item.text)
  }

  return (
    <li className="group flex items-center gap-1 px-2 py-1">
      {editing ? (
        <Input
          autoFocus
          value={text}
          maxLength={255}
          className="h-7"
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
            if (e.key === "Escape") {
              setText(item.text)
              setEditing(false)
            }
          }}
        />
      ) : (
        <button
          type="button"
          title="Click para editar"
          className="hover:bg-muted flex-1 rounded px-1.5 py-1 text-left text-sm"
          onClick={() => setEditing(true)}
        >
          {item.text}
        </button>
      )}
      <div className="flex shrink-0 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        <Button variant="ghost" size="icon-xs" aria-label="Subir" disabled={first || busy} onClick={() => onMove(-1)}>
          <ArrowUp />
        </Button>
        <Button variant="ghost" size="icon-xs" aria-label="Bajar" disabled={last || busy} onClick={() => onMove(1)}>
          <ArrowDown />
        </Button>
        <Button variant="ghost" size="icon-xs" aria-label="Eliminar" disabled={busy} onClick={onRemove}>
          <Trash2 />
        </Button>
      </div>
    </li>
  )
}
