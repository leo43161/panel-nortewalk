"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"

import { api, apiErrorMessage } from "@/lib/api"
import type { ApiResponse, Provider } from "@/types"

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
const e164Re = /^\+[1-9]\d{6,14}$/

const baseFields = {
  business_name: z.string().min(2, "Mínimo 2 caracteres"),
  contact_name: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  whatsapp_e164: z.string().regex(e164Re, "Formato E.164, ej: +5493812345678"),
  city: z.string().min(2, "Mínimo 2 caracteres"),
  province: z.string().min(1).default("Tucumán"),
  country: z.string().length(2).default("AR"),
  bio: z.string().max(2000).optional().or(z.literal("")),
  logo_url: z
    .string()
    .url("URL inválida")
    .max(500)
    .optional()
    .or(z.literal("")),
}

const createSchema = z.object({
  ...baseFields,
  slug: z.string().regex(slugRe, "Sólo minúsculas, números y guiones"),
  trial_days: z.coerce.number().int().min(0).max(180).default(14),
})

const editSchema = z.object({
  ...baseFields,
  notes_admin: z.string().max(2000).optional().or(z.literal("")),
})

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
    .slice(0, 120)
}

type CreateIn = z.input<typeof createSchema>
type CreateOut = z.output<typeof createSchema>
type EditIn = z.input<typeof editSchema>
type EditOut = z.output<typeof editSchema>

interface CreateProps {
  mode: "create"
  initial?: undefined
}
interface EditProps {
  mode: "edit"
  initial: Provider
}

export function ProviderForm(props: CreateProps | EditProps) {
  if (props.mode === "edit") return <EditForm initial={props.initial} />
  return <CreateForm />
}

function CreateForm() {
  const router = useRouter()
  const qc = useQueryClient()
  const [submitting, setSubmitting] = React.useState(false)
  const [slugTouched, setSlugTouched] = React.useState(false)

  const form = useForm<CreateIn, unknown, CreateOut>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      slug: "",
      business_name: "",
      contact_name: "",
      email: "",
      whatsapp_e164: "",
      city: "",
      province: "Tucumán",
      country: "AR",
      bio: "",
      logo_url: "",
      trial_days: 14,
    },
  })

  const businessName = form.watch("business_name")
  React.useEffect(() => {
    if (!slugTouched && businessName) {
      form.setValue("slug", slugify(businessName), { shouldValidate: true })
    }
  }, [businessName, slugTouched, form])

  const onSubmit = async (values: CreateOut) => {
    setSubmitting(true)
    try {
      const { data } = await api.post<ApiResponse<Provider>>(
        "/provider_create",
        values
      )
      toast.success("Proveedor creado")
      qc.invalidateQueries({ queryKey: ["providers"] })
      const id = data.data?.id
      router.replace(id ? `/providers/${id}` : "/providers")
    } catch (err) {
      toast.error(apiErrorMessage(err, "No se pudo crear el proveedor"))
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
            <CardTitle>Datos del negocio</CardTitle>
            <CardDescription>
              Identidad pública del proveedor. El slug se autogenera desde el
              nombre, podés editarlo.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="business_name"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Nombre comercial</FormLabel>
                  <FormControl>
                    <Input placeholder="Tucu Walking Tours" {...field} />
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
                  <FormLabel>Slug (URL pública)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="tucu-walking"
                      {...field}
                      onChange={(e) => {
                        setSlugTouched(true)
                        field.onChange(e)
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Aparece en URLs: <code>/p/{field.value || "tu-slug"}</code>.
                    Sólo minúsculas, números y guiones.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="logo_url"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Logo URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Descripción breve del proveedor, especialidades, etc."
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
            <CardTitle>Contacto</CardTitle>
            <CardDescription>
              Datos de la persona responsable. Email y WhatsApp se usan para
              notificaciones y leads.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="contact_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Persona de contacto</FormLabel>
                  <FormControl>
                    <Input placeholder="Pedro García" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="pedro@empresa.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="whatsapp_e164"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>WhatsApp</FormLabel>
                  <FormControl>
                    <Input placeholder="+5493812345678" {...field} />
                  </FormControl>
                  <FormDescription>
                    Formato E.164 con código de país, sin espacios.
                  </FormDescription>
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
                    <Input placeholder="San Miguel de Tucumán" {...field} />
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
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
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

        <Card>
          <CardHeader>
            <CardTitle>Suscripción</CardTitle>
            <CardDescription>
              Se crea en estado <code>trial</code> con los días indicados. Se
              cobra US$ 10 / mes una vez activado.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="trial_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Días de prueba</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={180}
                      {...field}
                      value={field.value as number}
                    />
                  </FormControl>
                  <FormDescription>0 = sin trial</FormDescription>
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
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Crear proveedor
          </Button>
        </div>
      </form>
    </Form>
  )
}

function EditForm({ initial }: { initial: Provider }) {
  const router = useRouter()
  const qc = useQueryClient()
  const [submitting, setSubmitting] = React.useState(false)

  const form = useForm<EditIn, unknown, EditOut>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      business_name: initial.business_name,
      contact_name: initial.contact_name,
      email: initial.email,
      whatsapp_e164: initial.whatsapp_e164,
      city: initial.city,
      province: initial.province || "Tucumán",
      country: initial.country || "AR",
      bio: initial.bio ?? "",
      logo_url: initial.logo_url ?? "",
      notes_admin: initial.notes_admin ?? "",
    },
  })

  const onSubmit = async (values: EditOut) => {
    setSubmitting(true)
    try {
      await api.post<ApiResponse<unknown>>("/provider_update", {
        id: initial.id,
        ...values,
      })
      toast.success("Proveedor actualizado")
      qc.invalidateQueries({ queryKey: ["provider", initial.id] })
      qc.invalidateQueries({ queryKey: ["providers"] })
      router.replace(`/providers/${initial.id}`)
    } catch (err) {
      toast.error(apiErrorMessage(err, "No se pudo actualizar"))
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
            <CardTitle>Datos del negocio</CardTitle>
            <CardDescription>
              Slug y estado se modifican desde otras acciones.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="business_name"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Nombre comercial</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem className="md:col-span-2">
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input value={initial.slug} disabled readOnly />
              </FormControl>
              <FormDescription>
                No editable. Contactar soporte para cambiarlo.
              </FormDescription>
            </FormItem>
            <FormField
              control={form.control}
              name="logo_url"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Logo URL</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacto</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="contact_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Persona de contacto</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="whatsapp_e164"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>WhatsApp</FormLabel>
                  <FormControl>
                    <Input placeholder="+5493812345678" {...field} />
                  </FormControl>
                  <FormDescription>
                    Formato E.164 con código de país, sin espacios.
                  </FormDescription>
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

        <Card>
          <CardHeader>
            <CardTitle>Notas internas</CardTitle>
            <CardDescription>
              Sólo visibles para el equipo admin. No se muestran al proveedor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="notes_admin"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea rows={4} {...field} />
                  </FormControl>
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
            Guardar cambios
          </Button>
        </div>
      </form>
    </Form>
  )
}
