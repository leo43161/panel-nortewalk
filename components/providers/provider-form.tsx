"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { api, apiErrorMessage } from "@/lib/api"
import type { ApiResponse, Provider } from "@/types"

import { Button } from "@/components/ui/button"
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

const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const e164Re = /^\+[1-9]\d{6,14}$/

const createSchema = z.object({
  slug: z.string().regex(slugRe, "Sólo minúsculas, números y guiones"),
  business_name: z.string().min(2, "Mínimo 2 caracteres"),
  contact_name: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  whatsapp_e164: z
    .string()
    .regex(e164Re, "Formato E.164, ej: +5493812345678"),
  city: z.string().min(2),
  province: z.string().optional(),
  country: z.string().length(2).optional().or(z.literal("")),
  bio: z.string().optional(),
  logo_url: z.string().url().optional().or(z.literal("")),
  trial_days: z.coerce.number().int().min(0).max(180).default(14),
})

type FormIn = z.input<typeof createSchema>
type FormOut = z.output<typeof createSchema>

export function ProviderForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = React.useState(false)

  const form = useForm<FormIn, unknown, FormOut>({
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

  const onSubmit = async (values: FormOut) => {
    setSubmitting(true)
    try {
      const { data } = await api.post<ApiResponse<Provider>>(
        "/provider_create",
        values
      )
      toast.success("Proveedor creado")
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
        className="grid gap-4 md:grid-cols-2"
        noValidate
      >
        <FormField
          control={form.control}
          name="business_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre comercial</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input placeholder="tucu-walking" {...field} />
              </FormControl>
              <FormDescription>URL pública del proveedor</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
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
            <FormItem>
              <FormLabel>WhatsApp (E.164)</FormLabel>
              <FormControl>
                <Input placeholder="+5493812345678" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
              <FormLabel>País (ISO 2)</FormLabel>
              <FormControl>
                <Input maxLength={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
                <Input placeholder="https://…" {...field} />
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
                <textarea
                  rows={4}
                  className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="md:col-span-2 flex justify-end gap-2">
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
