"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { api, apiErrorMessage } from "@/lib/api"
import type { ApiResponse, Experience } from "@/types"

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const schema = z.object({
  title: z.string().min(2),
  short_desc: z.string().max(280).optional().or(z.literal("")),
  long_desc: z.string().optional().or(z.literal("")),
  vertical: z.enum(["fwt", "adventure", "experience", "gastronomy"]),
  category: z.string().min(2),
  type: z.enum(["free", "paid"]),
  price: z.coerce.number().min(0).optional().or(z.nan()),
  price_min: z.coerce.number().min(0).optional().or(z.nan()),
  price_max: z.coerce.number().min(0).optional().or(z.nan()),
  currency: z.string().length(3).default("ARS"),
  duration_min: z.coerce.number().int().min(1).max(2880),
  difficulty: z.enum(["easy", "moderate", "hard", "expert"]),
  meeting_point: z.string().optional().or(z.literal("")),
  city: z.string().min(2),
  province: z.string().min(2),
  country: z.string().length(2),
  min_pax: z.coerce.number().int().min(1).max(255),
  max_pax: z.coerce.number().int().min(1).max(255),
  is_active: z.coerce.number().int().min(0).max(1),
  is_featured: z.coerce.number().int().min(0).max(1),
})

type FormIn = z.input<typeof schema>
type FormOut = z.output<typeof schema>

const VERTICALS = ["fwt", "adventure", "experience", "gastronomy"] as const
const TYPES = ["free", "paid"] as const
const DIFFICULTIES = ["easy", "moderate", "hard", "expert"] as const

function toNumOrUndef(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

export function GeneralTab({ experience }: { experience: Experience }) {
  const qc = useQueryClient()

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: experience.title,
      short_desc: experience.short_desc ?? "",
      long_desc: experience.long_desc ?? "",
      vertical: experience.vertical,
      category: experience.category,
      type: experience.type,
      price: toNumOrUndef(experience.price) ?? undefined,
      price_min: toNumOrUndef(experience.price_min) ?? undefined,
      price_max: toNumOrUndef(experience.price_max) ?? undefined,
      currency: experience.currency,
      duration_min: experience.duration_min,
      difficulty: experience.difficulty,
      meeting_point: experience.meeting_point ?? "",
      city: experience.city,
      province: experience.province,
      country: experience.country,
      min_pax: experience.min_pax,
      max_pax: experience.max_pax,
      is_active: experience.is_active,
      is_featured: experience.is_featured,
    },
  })

  const update = useMutation({
    mutationFn: async (values: FormOut) => {
      const { data } = await api.post<ApiResponse<unknown>>(
        "/experience_update",
        { id: experience.id, ...values }
      )
      return data
    },
    onSuccess: () => {
      toast.success("Cambios guardados")
      qc.invalidateQueries({ queryKey: ["experience", experience.id] })
      qc.invalidateQueries({ queryKey: ["experiences"] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos generales</CardTitle>
        <CardDescription>
          Edición de campos base (ES). Las traducciones EN/PT se manejan
          aparte.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => update.mutate(v))}
            className="grid gap-4 md:grid-cols-2"
            noValidate
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="short_desc"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Descripción corta (≤280)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
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
                    <Textarea rows={5} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                        <SelectItem key={v} value={v}>
                          {v}
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
                    <Input placeholder="kayak, trekking…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                      {TYPES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
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
                      {DIFFICULTIES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
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
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
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
                    <Input maxLength={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price_min"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio mín. (gorra)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
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
              name="price_max"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio máx. (gorra)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
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
              name="meeting_point"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Punto de encuentro</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>¿Activa?</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">Sí</SelectItem>
                      <SelectItem value="0">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_featured"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>¿Destacada?</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">Sí</SelectItem>
                      <SelectItem value="0">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={update.isPending}>
                {update.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Guardar cambios
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
