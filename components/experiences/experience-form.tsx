"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  ExternalLink,
  HandCoins,
  Loader2,
  MapPin,
  RotateCcw,
  Save,
  Tag,
  X,
} from "lucide-react"

import { api, apiErrorMessage } from "@/lib/api"
import {
  CITIES,
  DIFFICULTIES,
  DURATION_PRESETS,
  PROVINCES,
  VERTICALS,
  cityLabel,
} from "@/lib/labels"
import { formatDuration, parseMapsLocation, slugify } from "@/lib/utils"
import type { ApiResponse, Experience, Provider } from "@/types"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Chip, OptionCard } from "@/components/ui/chip"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

/* =====================================================================
 * Formulario único de experiencia: "Nueva experiencia" y la pestaña
 * "Información" del editor usan este mismo componente.
 * ===================================================================== */

const OTHER_CITY = "__other"

/** "" -> null, "5000" -> 5000 */
const money = z
  .union([z.literal(""), z.coerce.number().min(0, "No puede ser negativo")])
  .transform((v) => (v === "" ? null : v))

const schema = z
  .object({
    provider_id: z.coerce.number().int().min(1, "Elegí a quién pertenece"),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones"),
    title: z.string().trim().min(3, "Escribí un título").max(200),
    short_desc: z.string().max(280, "Máximo 280 caracteres"),
    long_desc: z.string(),
    vertical: z.enum(["fwt", "adventure", "experience", "gastronomy"]),
    category: z.string().trim().min(2, "Elegí o escribí una actividad").max(60),
    type: z.enum(["free", "paid"]),
    price: money,
    price_min: money,
    price_max: money,
    currency: z.enum(["ARS", "USD"]),
    duration_min: z.coerce
      .number()
      .int()
      .min(15, "Mínimo 15 minutos")
      .max(2880, "Máximo 48 horas"),
    difficulty: z.enum(["easy", "moderate", "hard", "expert"]),
    min_pax: z.coerce.number().int().min(1, "Mínimo 1").max(255),
    max_pax: z.coerce.number().int().min(1, "Mínimo 1").max(255, "Máximo 255"),
    min_age: z.coerce.number().int().min(0).max(99),
    city: z.string().min(2, "Elegí la ciudad"),
    province: z.string().min(2, "Elegí la provincia"),
    meeting_point: z.string().max(255),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
  })
  .refine((v) => v.max_pax >= v.min_pax, {
    message: "Tiene que ser igual o mayor al mínimo",
    path: ["max_pax"],
  })
  .refine((v) => v.type !== "paid" || (v.price ?? 0) > 0, {
    message: "Poné el precio por persona",
    path: ["price"],
  })
  .refine(
    (v) => v.price_min == null || v.price_max == null || v.price_max >= v.price_min,
    { message: "Tiene que ser igual o mayor al “desde”", path: ["price_max"] }
  )

type FormIn = z.input<typeof schema>
type FormOut = z.output<typeof schema>
type ExpForm = UseFormReturn<FormIn, unknown, FormOut>

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v))
const numOrNull = (v: unknown) =>
  v === null || v === undefined || v === "" ? null : Number(v)

function defaultsFrom(exp?: Experience, providerId?: number): FormIn {
  if (!exp) {
    return {
      provider_id: providerId ?? 0,
      slug: "",
      title: "",
      short_desc: "",
      long_desc: "",
      vertical: "fwt",
      category: "",
      type: "free",
      price: "",
      price_min: "",
      price_max: "",
      currency: "ARS",
      duration_min: 120,
      difficulty: "easy",
      min_pax: 1,
      max_pax: 15,
      min_age: 0,
      city: "san-miguel-de-tucuman",
      province: "Tucumán",
      meeting_point: "",
      latitude: null,
      longitude: null,
    }
  }
  return {
    provider_id: Number(exp.provider_id),
    slug: exp.slug,
    title: exp.title,
    short_desc: exp.short_desc ?? "",
    long_desc: exp.long_desc ?? "",
    vertical: exp.vertical,
    category: exp.category,
    type: exp.type,
    price: str(exp.price),
    price_min: str(exp.price_min),
    price_max: str(exp.price_max),
    currency: exp.currency === "USD" ? "USD" : "ARS",
    duration_min: Number(exp.duration_min),
    difficulty: exp.difficulty,
    min_pax: Number(exp.min_pax),
    max_pax: Number(exp.max_pax),
    min_age: Number(exp.min_age ?? 0),
    city: exp.city,
    province: exp.province,
    meeting_point: exp.meeting_point ?? "",
    latitude: numOrNull(exp.latitude),
    longitude: numOrNull(exp.longitude),
  }
}

/** Lo que espera /experience_create y /experience_update (el SP pisa TODO, hay que mandar todo). */
function toPayload(v: FormOut, exp?: Experience) {
  return {
    ...v,
    country: exp?.country ?? "AR",
    price: v.type === "paid" ? v.price : null,
    price_min: v.type === "free" ? v.price_min : null,
    price_max: v.type === "free" ? v.price_max : null,
    // El panel no edita SEO: se conserva lo que haya.
    meta_title: exp?.meta_title ?? null,
    meta_description: exp?.meta_description ?? null,
  }
}

type Props =
  | { mode: "create"; forcedProviderId?: number; redirectBase?: string }
  | { mode: "edit"; experience: Experience }

export function ExperienceForm(props: Props) {
  const router = useRouter()
  const qc = useQueryClient()
  const exp = props.mode === "edit" ? props.experience : undefined
  const forcedProviderId = props.mode === "create" ? props.forcedProviderId : undefined
  const [saving, setSaving] = React.useState(false)
  const [slugTouched, setSlugTouched] = React.useState(false)
  // WhereSection tiene estado propio (modo "otra ciudad"): se remonta al resetear.
  const [resetCount, setResetCount] = React.useState(0)

  const form: ExpForm = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: defaultsFrom(exp, forcedProviderId),
  })

  // Si la experiencia cambia en el server (otra pestaña, activar/ocultar),
  // re-sincronizamos, salvo que haya cambios sin guardar: esos no se pisan.
  React.useEffect(() => {
    if (exp && !form.formState.isDirty) form.reset(defaultsFrom(exp))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exp?.id, exp?.updated_at])

  const title = useWatch({ control: form.control, name: "title" })
  React.useEffect(() => {
    if (props.mode === "create" && !slugTouched) {
      form.setValue("slug", slugify(title ?? ""), { shouldValidate: !!title })
    }
  }, [title, slugTouched, props.mode, form])

  const onSubmit = async (values: FormOut) => {
    setSaving(true)
    try {
      if (props.mode === "edit") {
        await api.post("/experience_update", { id: props.experience.id, ...toPayload(values, exp) })
        form.reset(form.getValues())
        toast.success("Cambios guardados")
        qc.invalidateQueries({ queryKey: ["experience", props.experience.id] })
        qc.invalidateQueries({ queryKey: ["experiences"] })
      } else {
        const { data } = await api.post<ApiResponse<{ id: number }>>(
          "/experience_create",
          toPayload(values)
        )
        toast.success("Experiencia creada. Ahora sumale fotos y horarios.")
        qc.invalidateQueries({ queryKey: ["experiences"] })
        const base = props.redirectBase ?? "/experiences"
        router.replace(data.data?.id ? `${base}/${data.data.id}` : base)
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, "No se pudo guardar"))
    } finally {
      setSaving(false)
    }
  }

  const dirty = form.formState.isDirty

  // Cerrar la pestaña o recargar con cambios sin guardar: el navegador pregunta antes.
  React.useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <BasicsSection form={form} mode={props.mode} showProvider={props.mode === "create" && !forcedProviderId} onSlugTouched={() => setSlugTouched(true)} />
        <DescriptionSection form={form} />
        <PriceSection form={form} />
        <LogisticsSection form={form} />
        <WhereSection key={resetCount} form={form} />

        {props.mode === "edit" ? (
          dirty && (
          <div className="bg-card/95 animate-in fade-in slide-in-from-bottom-2 sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 flex items-center justify-between gap-2 rounded-xl border p-2 pl-4 shadow-lg backdrop-blur md:bottom-4">
            <p className="text-sm font-medium">Tenés cambios sin guardar</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={() => {
                  form.reset(defaultsFrom(exp))
                  setResetCount((c) => c + 1)
                }}
              >
                <RotateCcw />
                <span className="hidden sm:inline">Descartar</span>
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : <Save />}
                Guardar
              </Button>
            </div>
          </div>
          )
        ) : (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" size="lg" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              Crear experiencia
            </Button>
          </div>
        )}
      </form>
    </Form>
  )
}

/* ---------------------------------------------------------------- */

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  )
}

function BasicsSection({
  form,
  mode,
  showProvider,
  onSlugTouched,
}: {
  form: ExpForm
  mode: "create" | "edit"
  showProvider: boolean
  onSlugTouched: () => void
}) {
  const vertical = useWatch({ control: form.control, name: "vertical" })
  const category = useWatch({ control: form.control, name: "category" })
  const suggestions = VERTICALS.find((v) => v.value === vertical)?.categories ?? []
  const [customCategory, setCustomCategory] = React.useState(false)
  const showCustom = customCategory || (!!category && !suggestions.includes(category))

  const providers = useQuery({
    queryKey: ["providers-mini"],
    enabled: showProvider,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Provider[]>>("/provider_list", {
        params: { limit: 200 },
      })
      return data.data ?? []
    },
  })

  return (
    <Section title="Lo básico" description="Qué es y cómo se llama.">
      {showProvider && (
        <FormField
          control={form.control}
          name="provider_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>¿De qué guía o empresa es?</FormLabel>
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(Number(v))}
                disabled={providers.isLoading}
              >
                <FormControl>
                  <SelectTrigger className="w-full sm:w-96">
                    <SelectValue placeholder={providers.isLoading ? "Cargando…" : "Elegí uno"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(providers.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.business_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Título</FormLabel>
            <FormControl>
              <Input
                className="h-10 text-base"
                placeholder="Ej: Free walking tour por el centro histórico"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {mode === "create" && (
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-muted-foreground text-xs font-normal">
                Dirección en el sitio
              </FormLabel>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground shrink-0">…/experiencia/</span>
                <FormControl>
                  <Input
                    className="h-7 font-mono text-xs"
                    {...field}
                    onChange={(e) => {
                      onSlugTouched()
                      field.onChange(e)
                    }}
                  />
                </FormControl>
              </div>
              <FormDescription className="text-xs">
                Se arma sola con el título. Después no se puede cambiar.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="vertical"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tipo de experiencia</FormLabel>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {VERTICALS.map((v) => (
                <OptionCard
                  key={v.value}
                  active={field.value === v.value}
                  title={v.label}
                  hint={v.hint}
                  onClick={() => field.onChange(v.value)}
                />
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="category"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Actividad</FormLabel>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((c) => (
                <Chip
                  key={c}
                  active={!showCustom && category === c}
                  onClick={() => {
                    setCustomCategory(false)
                    form.setValue("category", c, { shouldDirty: true, shouldValidate: true })
                  }}
                >
                  {c}
                </Chip>
              ))}
              <Chip
                active={showCustom}
                onClick={() => {
                  setCustomCategory(true)
                  if (suggestions.includes(category)) form.setValue("category", "", { shouldDirty: true })
                }}
              >
                Otra…
              </Chip>
            </div>
            {showCustom && (
              <FormControl>
                <Input autoFocus className="sm:w-72" placeholder="Ej: avistaje de aves" {...field} />
              </FormControl>
            )}
            <FormDescription>Se muestra junto al tipo, por ejemplo “Aventura · trekking”.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </Section>
  )
}

function DescriptionSection({ form }: { form: ExpForm }) {
  return (
    <Section title="Descripción" description="Lo que lee el turista antes de reservar.">
      <FormField
        control={form.control}
        name="short_desc"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-baseline justify-between">
              <FormLabel>Resumen</FormLabel>
              <span className="text-muted-foreground text-xs tabular-nums">
                {field.value?.length ?? 0}/280
              </span>
            </div>
            <FormControl>
              <Textarea
                rows={2}
                maxLength={280}
                placeholder="Una o dos frases que vendan la experiencia. Aparece en las tarjetas del listado."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="long_desc"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descripción completa</FormLabel>
            <FormControl>
              <Textarea
                rows={8}
                placeholder="Contá qué van a vivir, qué los hace especiales, qué tienen que llevar… Dejá una línea en blanco para separar párrafos."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </Section>
  )
}

function PriceSection({ form }: { form: ExpForm }) {
  const type = useWatch({ control: form.control, name: "type" })
  const currency = useWatch({ control: form.control, name: "currency" })

  const moneyInput = (name: "price" | "price_min" | "price_max", label: string, placeholder: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">
              $
            </span>
            <FormControl>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                className="pl-6"
                placeholder={placeholder}
                {...field}
                value={(field.value as string | number | null) ?? ""}
              />
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Section title="Precio">
      <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>¿Cómo se cobra?</FormLabel>
            <div className="grid gap-2 sm:grid-cols-2">
              <OptionCard
                active={field.value === "free"}
                icon={<HandCoins className="size-5" />}
                title="A la gorra"
                hint="El turista aporta lo que quiere al final."
                onClick={() => field.onChange("free")}
              />
              <OptionCard
                active={field.value === "paid"}
                icon={<Tag className="size-5" />}
                title="Precio fijo"
                hint="Se cobra un valor por persona."
                onClick={() => field.onChange("paid")}
              />
            </div>
          </FormItem>
        )}
      />

      <div className="grid items-start gap-4 sm:grid-cols-[1fr_1fr_10rem]">
        {type === "paid" ? (
          <div className="sm:col-span-2">{moneyInput("price", "Precio por persona", "35000")}</div>
        ) : (
          <>
            {moneyInput("price_min", "Aporte sugerido: desde", "opcional")}
            {moneyInput("price_max", "hasta", "opcional")}
          </>
        )}
        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Moneda</FormLabel>
              <div className="flex gap-1.5">
                <Chip active={field.value === "ARS"} onClick={() => field.onChange("ARS")}>
                  Pesos
                </Chip>
                <Chip active={field.value === "USD"} onClick={() => field.onChange("USD")}>
                  Dólares
                </Chip>
              </div>
            </FormItem>
          )}
        />
      </div>
      {type === "free" && (
        <p className="text-muted-foreground text-xs">
          El sugerido es solo orientativo: se muestra como “aporte sugerido {currency === "USD" ? "US$" : "$"}…”.
        </p>
      )}
    </Section>
  )
}

function LogisticsSection({ form }: { form: ExpForm }) {
  const duration = Number(useWatch({ control: form.control, name: "duration_min" }))
  const difficulty = useWatch({ control: form.control, name: "difficulty" })

  return (
    <Section title="Duración y grupo">
      <FormField
        control={form.control}
        name="duration_min"
        render={({ field }) => (
          <FormItem>
            <FormLabel>¿Cuánto dura?</FormLabel>
            <div className="flex flex-wrap gap-1.5">
              {DURATION_PRESETS.map((m) => (
                <Chip key={m} active={duration === m} onClick={() => field.onChange(m)}>
                  {formatDuration(m)}
                </Chip>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">u otra:</span>
              <FormControl>
                <Input
                  type="number"
                  min={15}
                  step={15}
                  className="w-24"
                  {...field}
                  value={field.value as number}
                />
              </FormControl>
              <span className="text-muted-foreground">
                minutos{duration >= 60 ? ` (${formatDuration(duration)})` : ""}
              </span>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="difficulty"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Dificultad</FormLabel>
            <div className="flex flex-wrap gap-1.5">
              {DIFFICULTIES.map((d) => (
                <Chip key={d.value} active={field.value === d.value} onClick={() => field.onChange(d.value)}>
                  {d.label}
                </Chip>
              ))}
            </div>
            <FormDescription>{DIFFICULTIES.find((d) => d.value === difficulty)?.hint}</FormDescription>
          </FormItem>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {(
          [
            ["min_pax", "Mínimo de personas", "Para que la salida se haga."],
            ["max_pax", "Máximo de personas", "Se usa como cupo de cada salida."],
            ["min_age", "Edad mínima", "0 = apta para todas las edades."],
          ] as const
        ).map(([name, label, hint]) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{label}</FormLabel>
                <FormControl>
                  <Input type="number" min={0} max={255} className="w-28" {...field} value={field.value as number} />
                </FormControl>
                <FormDescription className="text-xs">{hint}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </div>
    </Section>
  )
}

function WhereSection({ form }: { form: ExpForm }) {
  const city = useWatch({ control: form.control, name: "city" })
  const lat = useWatch({ control: form.control, name: "latitude" })
  const lng = useWatch({ control: form.control, name: "longitude" })
  const known = CITIES.some((c) => c.slug === city)
  const [otherMode, setOtherMode] = React.useState(!known)
  const [otherName, setOtherName] = React.useState(known ? "" : cityLabel(city))
  const [mapInput, setMapInput] = React.useState("")

  const set = (name: "city" | "province" | "latitude" | "longitude", v: string | number | null) =>
    form.setValue(name, v as never, { shouldDirty: true, shouldValidate: true })

  const pickCity = (v: string) => {
    if (v === OTHER_CITY) {
      setOtherMode(true)
      // Sin validar todavía: que no aparezca en rojo antes de escribir el nombre.
      form.setValue("city", slugify(otherName), { shouldDirty: true })
      return
    }
    setOtherMode(false)
    set("city", v)
    set("province", CITIES.find((c) => c.slug === v)?.province ?? "Tucumán")
  }

  // Se interpreta al pegar, al salir del campo o con Enter; nunca a mitad de tipeo
  // (con "-65.3748" a medio escribir ya matchearía "-6").
  const applyMap = (text: string) => {
    const pos = parseMapsLocation(text)
    if (!pos) return false
    set("latitude", pos.lat)
    set("longitude", pos.lng)
    setMapInput("")
    return true
  }

  return (
    <Section title="Dónde" description="Dónde se juntan con el guía.">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="city"
          render={() => (
            <FormItem>
              <FormLabel>Ciudad</FormLabel>
              <Select value={otherMode ? OTHER_CITY : city} onValueChange={(v) => pickCity(String(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCES.map((p) => (
                    <SelectGroup key={p}>
                      <SelectLabel>{p}</SelectLabel>
                      {CITIES.filter((c) => c.province === p).map((c) => (
                        <SelectItem key={c.slug} value={c.slug}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                  <SelectSeparator />
                  <SelectItem value={OTHER_CITY}>Otra ciudad…</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {otherMode && (
          <div className="grid grid-cols-2 gap-2 sm:col-span-2">
            <div className="grid gap-2">
              <span className="text-sm font-medium">Nombre de la ciudad</span>
              <Input
                value={otherName}
                placeholder="Ej: Villa Nougués"
                onChange={(e) => {
                  setOtherName(e.target.value)
                  set("city", slugify(e.target.value))
                }}
              />
            </div>
            <FormField
              control={form.control}
              name="province"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provincia</FormLabel>
                  <Select value={field.value} onValueChange={(v) => field.onChange(String(v))}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVINCES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
        )}
      </div>

      <FormField
        control={form.control}
        name="meeting_point"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Punto de encuentro</FormLabel>
            <FormControl>
              <Input placeholder="Ej: Fuente de Plaza Independencia, frente a Casa de Gobierno" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-2">
        <span className="text-sm font-medium">Ubicación en el mapa</span>
        {lat != null && lng != null ? (
          <div className="bg-muted/40 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2 text-sm">
            <MapPin className="text-primary size-4" />
            <span className="font-mono text-xs">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </span>
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noopener"
              className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
            >
              Ver en Google Maps <ExternalLink className="size-3" />
            </a>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="ml-auto"
              onClick={() => {
                set("latitude", null)
                set("longitude", null)
              }}
            >
              <X />
              Quitar
            </Button>
          </div>
        ) : (
          <>
            <Input
              value={mapInput}
              onChange={(e) => setMapInput(e.target.value)}
              onPaste={(e) => {
                if (applyMap(e.clipboardData.getData("text"))) e.preventDefault()
              }}
              onBlur={() => applyMap(mapInput)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  applyMap(mapInput)
                }
              }}
              placeholder="Pegá acá el link de Google Maps o las coordenadas"
            />
            <p className="text-muted-foreground text-xs">
              {!mapInput
                ? "Opcional, pero ayuda: el turista ve el botón “Cómo llegar”."
                : parseMapsLocation(mapInput)
                  ? "Apretá Enter para usar esta ubicación."
                  : "No encontré coordenadas. En Google Maps: click derecho sobre el punto → copiá los números que aparecen arriba (ej: -26.8305, -65.2038) y pegalos acá."}
            </p>
          </>
        )}
      </div>
    </Section>
  )
}
