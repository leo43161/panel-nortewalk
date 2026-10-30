import type { Experience } from "@/types"

export type ReadinessKey = "info" | "photos" | "inclusions" | "schedules" | "route"

export interface ReadinessItem {
  key: ReadinessKey
  label: string
  done: boolean
  optional?: boolean
}

/**
 * Qué le falta a una experiencia para estar completa. Misma regla en el editor
 * (con los conteos reales) y en los listados (con los conteos del SP).
 * Un conteo undefined = no se sabe: no se marca como faltante.
 */
export function readiness(
  e: Experience,
  c: { photos?: number; inclusions?: number; schedules?: number; route?: number }
): ReadinessItem[] {
  const has = (n?: number) => n === undefined || n > 0
  return [
    { key: "info", label: "Descripción", done: !!e.short_desc?.trim() && !!e.long_desc?.trim() },
    { key: "photos", label: "Fotos", done: has(c.photos) },
    { key: "inclusions", label: "Qué incluye", done: has(c.inclusions) },
    { key: "schedules", label: "Horarios", done: has(c.schedules) },
    { key: "route", label: "Recorrido", done: has(c.route), optional: true },
  ]
}

const count = (v: unknown) => (v === undefined || v === null ? undefined : Number(v))

/** Lo obligatorio que falta, a partir de una fila del listado: ["Fotos", "Horarios"]. */
export function experienceGaps(e: Experience): string[] {
  return readiness(e, {
    photos: e.cover_image ? 1 : 0,
    inclusions: count(e.inclusions_count),
    schedules: count(e.active_schedules),
  })
    .filter((i) => !i.done && !i.optional)
    .map((i) => i.label)
}
