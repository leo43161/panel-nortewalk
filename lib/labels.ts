import type { Difficulty, Locale, ProviderStatus, Vertical } from "@/types"

/* =====================================================================
 * Textos visibles del panel. Todo lo que el usuario lee sale de acá,
 * así no aparecen códigos internos (fwt, pax, ISO, e164...) en pantalla.
 * ===================================================================== */

export const VERTICALS: {
  value: Vertical
  label: string
  hint: string
  tone: string
  categories: string[]
}[] = [
  {
    value: "fwt",
    label: "Free walking tour",
    hint: "Recorrido a pie, a la gorra",
    tone: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
    categories: ["ciudad", "historia", "arte urbano", "nocturno"],
  },
  {
    value: "adventure",
    label: "Aventura",
    hint: "Trekking, kayak, parapente…",
    tone: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
    categories: ["trekking", "kayak", "parapente", "cabalgata", "bici", "rafting"],
  },
  {
    value: "experience",
    label: "Experiencia",
    hint: "Cultura, talleres, bienestar…",
    tone: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
    categories: ["cultura", "taller", "fotografía", "bienestar"],
  },
  {
    value: "gastronomy",
    label: "Gastronomía",
    hint: "Comidas, vinos, mercados…",
    tone: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
    categories: ["gastro", "vinos", "mercado", "cocina"],
  },
]

export const VERTICAL_LABEL = Object.fromEntries(
  VERTICALS.map((v) => [v.value, v.label])
) as Record<Vertical, string>

export const VERTICAL_TONE = Object.fromEntries(
  VERTICALS.map((v) => [v.value, v.tone])
) as Record<Vertical, string>

export const DIFFICULTIES: { value: Difficulty; label: string; hint: string }[] = [
  { value: "easy", label: "Fácil", hint: "Apta para todos, sin esfuerzo." },
  { value: "moderate", label: "Moderada", hint: "Algo de caminata o subidas." },
  { value: "hard", label: "Difícil", hint: "Pide buen estado físico." },
  { value: "expert", label: "Experta", hint: "Hace falta experiencia previa." },
]

/** Idiomas en los que se puede dar una salida (y en los que está el sitio). */
export const LOCALES: { value: Locale; label: string; short: string }[] = [
  { value: "es", label: "Español", short: "ES" },
  { value: "en", label: "Inglés", short: "EN" },
  { value: "pt", label: "Portugués", short: "PT" },
]

export const LOCALE_LABEL = Object.fromEntries(
  LOCALES.map((l) => [l.value, l.label])
) as Record<Locale, string>

export const PROVIDER_STATUS_LABEL: Record<ProviderStatus, string> = {
  active: "Activo",
  trial: "En prueba",
  suspended: "Suspendido",
  banned: "Dado de baja",
}

/** 0 = domingo (convención de la DB). En pantalla la semana arranca el lunes. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
export const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
export const DAY_LONG = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
]

export const PROVINCES = [
  "Tucumán",
  "Salta",
  "Jujuy",
  "Catamarca",
  "Santiago del Estero",
  "La Rioja",
]

/**
 * Ciudades conocidas. En la DB se guarda el slug (lo usa el sitio para filtrar);
 * en pantalla se muestra el nombre. Si falta alguna, se elige "Otra ciudad".
 */
export const CITIES: { slug: string; name: string; province: string }[] = [
  { slug: "san-miguel-de-tucuman", name: "San Miguel de Tucumán", province: "Tucumán" },
  { slug: "yerba-buena", name: "Yerba Buena", province: "Tucumán" },
  { slug: "san-javier", name: "San Javier", province: "Tucumán" },
  { slug: "villa-nougues", name: "Villa Nougués", province: "Tucumán" },
  { slug: "raco", name: "Raco", province: "Tucumán" },
  { slug: "tafi-viejo", name: "Tafí Viejo", province: "Tucumán" },
  { slug: "tafi-del-valle", name: "Tafí del Valle", province: "Tucumán" },
  { slug: "el-mollar", name: "El Mollar", province: "Tucumán" },
  { slug: "amaicha-del-valle", name: "Amaicha del Valle", province: "Tucumán" },
  { slug: "el-cadillal", name: "El Cadillal", province: "Tucumán" },
  { slug: "salta", name: "Salta", province: "Salta" },
  { slug: "cafayate", name: "Cafayate", province: "Salta" },
  { slug: "cachi", name: "Cachi", province: "Salta" },
  { slug: "san-salvador-de-jujuy", name: "San Salvador de Jujuy", province: "Jujuy" },
  { slug: "purmamarca", name: "Purmamarca", province: "Jujuy" },
  { slug: "tilcara", name: "Tilcara", province: "Jujuy" },
  { slug: "humahuaca", name: "Humahuaca", province: "Jujuy" },
  { slug: "catamarca", name: "Catamarca", province: "Catamarca" },
  { slug: "santiago-del-estero", name: "Santiago del Estero", province: "Santiago del Estero" },
  { slug: "termas-de-rio-hondo", name: "Termas de Río Hondo", province: "Santiago del Estero" },
  { slug: "la-rioja", name: "La Rioja", province: "La Rioja" },
]

/** "san-miguel-de-tucuman" -> "San Miguel de Tucumán" (o capitaliza si no la conoce). */
export function cityLabel(city?: string | null): string {
  if (!city) return "—"
  const known = CITIES.find((c) => c.slug === city)
  if (known) return known.name
  if (!city.includes("-")) return city
  return city.replace(/-/g, " ").replace(/\b\p{L}/gu, (m) => m.toUpperCase())
}

/** Cosas que casi todos los tours incluyen o no: se agregan con un click. */
export const INCLUSION_SUGGESTIONS = {
  included: [
    "Guía local habilitado",
    "Seguro de actividad",
    "Agua",
    "Snack",
    "Degustación",
    "Fotos del recorrido",
  ],
  excluded: [
    "Traslado al punto de encuentro",
    "Entradas a museos",
    "Comidas y bebidas",
    "Propinas",
  ],
}

export const DURATION_PRESETS = [60, 90, 120, 150, 180, 240, 360, 480]
