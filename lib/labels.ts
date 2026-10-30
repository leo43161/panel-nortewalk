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
/** lat/lng = centro aproximado: solo para abrir el mapa ahí. */
export const CITIES: { slug: string; name: string; province: string; lat: number; lng: number }[] = [
  { slug: "san-miguel-de-tucuman", name: "San Miguel de Tucumán", province: "Tucumán", lat: -26.8305, lng: -65.2038 },
  { slug: "yerba-buena", name: "Yerba Buena", province: "Tucumán", lat: -26.8167, lng: -65.3167 },
  { slug: "san-javier", name: "San Javier", province: "Tucumán", lat: -26.785, lng: -65.37 },
  { slug: "villa-nougues", name: "Villa Nougués", province: "Tucumán", lat: -26.856, lng: -65.372 },
  { slug: "raco", name: "Raco", province: "Tucumán", lat: -26.665, lng: -65.44 },
  { slug: "tafi-viejo", name: "Tafí Viejo", province: "Tucumán", lat: -26.732, lng: -65.259 },
  { slug: "tafi-del-valle", name: "Tafí del Valle", province: "Tucumán", lat: -26.852, lng: -65.709 },
  { slug: "el-mollar", name: "El Mollar", province: "Tucumán", lat: -26.939, lng: -65.708 },
  { slug: "amaicha-del-valle", name: "Amaicha del Valle", province: "Tucumán", lat: -26.594, lng: -65.92 },
  { slug: "el-cadillal", name: "El Cadillal", province: "Tucumán", lat: -26.635, lng: -65.205 },
  { slug: "salta", name: "Salta", province: "Salta", lat: -24.7829, lng: -65.4122 },
  { slug: "cafayate", name: "Cafayate", province: "Salta", lat: -26.073, lng: -65.976 },
  { slug: "cachi", name: "Cachi", province: "Salta", lat: -25.12, lng: -66.164 },
  { slug: "san-salvador-de-jujuy", name: "San Salvador de Jujuy", province: "Jujuy", lat: -24.1858, lng: -65.2995 },
  { slug: "purmamarca", name: "Purmamarca", province: "Jujuy", lat: -23.745, lng: -65.499 },
  { slug: "tilcara", name: "Tilcara", province: "Jujuy", lat: -23.577, lng: -65.396 },
  { slug: "humahuaca", name: "Humahuaca", province: "Jujuy", lat: -23.205, lng: -65.35 },
  { slug: "catamarca", name: "Catamarca", province: "Catamarca", lat: -28.4696, lng: -65.7795 },
  { slug: "santiago-del-estero", name: "Santiago del Estero", province: "Santiago del Estero", lat: -27.7951, lng: -64.2615 },
  { slug: "termas-de-rio-hondo", name: "Termas de Río Hondo", province: "Santiago del Estero", lat: -27.493, lng: -64.86 },
  { slug: "la-rioja", name: "La Rioja", province: "La Rioja", lat: -29.4131, lng: -66.8558 },
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
