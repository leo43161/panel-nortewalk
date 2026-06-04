"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"

import { api, apiErrorMessage } from "@/lib/api"
import type { ApiResponse, Experience, Provider } from "@/types"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const schema = z
  .object({
    provider_id: z.coerce.number().int().positive("Seleccioná proveedor"),
    slug: z.string().regex(slugRe, "Sólo minúsculas, números y guiones"),
    title: z.string().min(2, "Mínimo 2 caracteres").max(200),
    short_desc: z.string().max(280).optional().or(z.literal("")),
    long_desc: z.string().optional().or(z.literal("")),
    vertical: z.enum(["fwt", "adventure", "experience", "gastronomy"]),
    category: z.string().min(2, "Requerido"),
    type: z.enum(["free", "paid"]),
    price: z.coerce.number().min(0).optional().or(z.nan()),
    currency: z.string().length(3).default("ARS"),
    duration_min: z.coerce.number().int().min(1).max(2880).default(120),
    difficulty: z.enum(["easy", "moderate", "hard", "expert"]).default("easy"),
    meeting_point: z.string().optional().or(z.literal("")),
    city: z.string().min(2, "Requerido"),
    province: z.string().min(1).default("Tucumán"),
    country: z.string().length(2).default("AR"),
    min_pax: z.coerce.number().int().min(1).max(255).default(1),
    max_pax: z.coerce.number().int().min(1).max(255).default(20),
  })
  .refine((v) => v.max_pax >= v.min_pax, {
    message: "Máx debe ser ≥ Mín",
    path: ["max_pax"],
  })
  .refine((v) => v.type !== "paid" || (v.price != null && !Number.isNaN(v.price)), {
    message: "Indicá precio para tipo pago",
    path: ["price"],
  })

type FormIn = z.input<typeof schema>
type FormOut = z.output<typeof schema>

const VERTICALS: { value: FormOut["vertical"]; label: string }[] = [
  { value: "fwt", label: "FWT (free walking tour)" },
  { value: "adventure", label: "Aventura" },
  { value: "experience", label: "Experiencia" },
  { value: "gastronomy", label: "Gastronomía" },
]

const DIFFICULTIES: { value: FormOut["difficulty"]; label: string }[] = [
  { value: "easy", label: "Fácil" },
  { value: "moderate", label: "Moderada" },
  { value: "hard", label: "Difícil" },
  { value: "expert", label: "Experta" },
]

const COUNTRIES = [
  { value: "AR", label: "Argentina" },
  { value: "CL", label: "Chile" },
  { value: "BO", label: "Bolivia" },
  { value: "BR", label: "Brasil" },
  { value: "UY", label: "Uruguay" },
  { value: "PY", label: "Paraguay" },
  { value: "PE", label: "Perú" },
]

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140)
}

interface ExperienceCreateFormProps {
  /** Si está set, oculta el selector de provider y usa este id. Útil cuando el creador es un guía. */
  forcedProviderId?: number
  /** Base path al que redirigir tras crear. Default "/experiences". */
  redirectBase?: string
}

export function ExperienceCreateForm({
  forcedProviderId,
  redirectBase = "/experiences",
}: ExperienceCreateFormProps = {}) {
  const router = useRouter()
  const qc = useQueryClient()
  const [submitting, setSubmitting] = React.useState(false)
  const [slugTouched, setSlugTouched] = React.useState(false)

  const providers = useQuery({
    queryKey: ["providers-mini"],
    enabled: !forcedProviderId,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Provider[]>>("/provider_list", {
        params: { limit: 200 },
      })
      return data.data
    },
  })

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: {
      provider_id: forcedProviderId,
      slug: "",
      title: "",
      short_desc: "",
      long_desc: "",
      vertical: "experience",
      category: "",
      type: "paid",
      price: undefined,
      currency: "ARS",
      duration_min: 120,
      difficulty: "easy",
      meeting_point: "",
      city: "San Miguel de Tucumán",
      province: "Tucumán",
      country: "AR",
      min_pax: 1,
      max_pax: 20,
    },
  })

  const title = form.watch("title")
  const type = form.watch("type")
  React.useEffect(() => {
    if (!slugTouched && title) {
      form.setValue("slug", slugify(title), { shouldValidate: true })
    }
  }, [title, slugTouched, form])

  const onSubmit = async (values: FormOut) => {
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = { ...values }
      if (values.type === "free") payload.price = null
      if (forcedProviderId) payload.provider_id = forcedProviderId
      const { data } = await api.post<ApiResponse<Experience>>(
        "/experience_create",
        payload
      )
      toast.success("Experiencia creada")
      qc.invalidateQueries({ queryKey: ["experiences"] })
      const id = data.data?.id
      router.replace(id ? `${redirectBase}/${id}` : redirectBase)
    } catch (err) {
      toast.error(apiErrorMessage(err, "No se pudo crear la experiencia"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
        <Card>
          <CardHeader>
            <CardTitle>Identidad</CardTitle>
            <CardDescription>
              Datos básicos visibles al turista. El slug se genera del título.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {!forcedProviderId && (
              <FormField
                control={form.control}
                name="provider_id"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Proveedor</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                      disabled={providers.isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              providers.isLoading
                                ? "Cargando…"
                                : "Elegí un proveedor"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(providers.data ?? []).map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.business_name}
                            <span className="text-muted-foreground ml-2 text-xs">
                              #{p.id} · {p.city}
                            </span>
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
                <FormItem className="md:col-span-2">
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Caminata histórica por San Miguel"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="caminata-historica-sm"
                      {...field}
                      onChange={(e) => {
                        setSlugTouched(true)
                        field.onChange(e)
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    URL pública:{" "}
                    <code className="bg-muted rounded px-1">
                      /e/{field.value || "tu-slug"}
                    </code>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="short_desc"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Descripción corta</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      maxLength={280}
                      placeholder="Hasta 280 caracteres. Va en listados y cards."
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
                <FormItem className="md:col-span-2">
                  <FormLabel>Descripción larga</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={5}
                      placeholder="Detalle de la experiencia, qué incluye, recomendaciones…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categorización</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="vertical"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vertical</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {VERTICALS.map((v) => (
                        <SelectItem key={v.value} value={v.value}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <FormControl>
                    <Input placeholder="trekking, kayak, ciudad…" {...field} />
                  </FormControl>
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
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DIFFICULTIES.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Precio</CardTitle>
            <CardDescription>
              <code>free</code> = sin precio fijo / a la gorra.{" "}
              <code>paid</code> requiere precio base.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="free">Gratis / a la gorra</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio {type === "paid" ? "" : "(opcional)"}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      disabled={type === "free"}
                      {...field}
                      value={(field.value as number | undefined) ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Moneda</FormLabel>
                  <FormControl>
                    <Input maxLength={3} placeholder="ARS" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logística</CardTitle>
            <CardDescription>
              Duración, capacidad y punto de encuentro.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="duration_min"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duración (min)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      value={field.value as number}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="min_pax"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mín. pax</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={255}
                      {...field}
                      value={field.value as number}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="max_pax"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Máx. pax</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={255}
                      {...field}
                      value={field.value as number}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="meeting_point"
              render={({ field }) => (
                <FormItem className="md:col-span-3">
                  <FormLabel>Punto de encuentro</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Plaza Independencia, frente a la catedral"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ubicación</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="province"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provincia</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>País</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Crear experiencia
          </Button>
        </div>
      </form>
    </Form>
  )
}
