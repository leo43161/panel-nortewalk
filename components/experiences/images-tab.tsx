"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Star, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { api, apiErrorMessage } from "@/lib/api"
import type { ApiResponse, ExperienceImage } from "@/types"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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

const schema = z.object({
  url: z.string().url("URL inválida"),
  alt_text: z.string().optional().or(z.literal("")),
  sort_order: z.coerce.number().int().min(0).default(0),
  is_cover: z.coerce.number().int().min(0).max(1).default(0),
})

type FormIn = z.input<typeof schema>
type FormOut = z.output<typeof schema>

export function ImagesTab({ experienceId }: { experienceId: number }) {
  const qc = useQueryClient()

  const list = useQuery({
    queryKey: ["images", experienceId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ExperienceImage[]>>(
        "/image_list",
        { params: { experience_id: experienceId } }
      )
      return data.data ?? []
    },
  })

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: { url: "", alt_text: "", sort_order: 0, is_cover: 0 },
  })

  const add = useMutation({
    mutationFn: async (values: FormOut) => {
      await api.post<ApiResponse<unknown>>("/image_add", {
        experience_id: experienceId,
        ...values,
      })
    },
    onSuccess: () => {
      toast.success("Imagen agregada")
      form.reset({ url: "", alt_text: "", sort_order: 0, is_cover: 0 })
      qc.invalidateQueries({ queryKey: ["images", experienceId] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const setCover = useMutation({
    mutationFn: async (id: number) => {
      await api.post<ApiResponse<unknown>>("/image_set_cover", { id })
    },
    onSuccess: () => {
      toast.success("Portada actualizada")
      qc.invalidateQueries({ queryKey: ["images", experienceId] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const remove = useMutation({
    mutationFn: async (id: number) => {
      await api.post<ApiResponse<unknown>>("/image_delete", { id })
    },
    onSuccess: () => {
      toast.success("Imagen eliminada")
      qc.invalidateQueries({ queryKey: ["images", experienceId] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Agregar imagen</CardTitle>
          <CardDescription>Pegá la URL de la imagen alojada.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => add.mutate(v))}
              className="grid gap-3"
              noValidate
            >
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="alt_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alt text</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sort_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orden</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        value={field.value as number}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={add.isPending}>
                {add.isPending && <Loader2 className="size-4 animate-spin" />}
                Agregar
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="lg:col-span-2 space-y-3">
        {list.isError && (
          <Alert variant="destructive">
            <AlertTitle>No se pudo cargar</AlertTitle>
            <AlertDescription>{apiErrorMessage(list.error)}</AlertDescription>
          </Alert>
        )}
        {list.isLoading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          </div>
        ) : (list.data ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Sin imágenes todavía.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {(list.data ?? []).map((img) => (
              <div
                key={img.id}
                className="bg-card relative overflow-hidden rounded-md border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.alt_text ?? ""}
                  className="aspect-video w-full object-cover"
                />
                {img.is_cover ? (
                  <span className="absolute top-1 left-1 rounded bg-amber-400/90 px-1.5 py-0.5 text-xs font-medium text-amber-900">
                    Portada
                  </span>
                ) : null}
                <div className="flex items-center justify-between gap-1 p-2">
                  <span className="text-muted-foreground truncate text-xs">
                    #{img.sort_order} · {img.alt_text || "sin alt"}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    {!img.is_cover && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setCover.mutate(img.id)}
                        disabled={setCover.isPending}
                        title="Marcar como portada"
                      >
                        <Star className="size-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove.mutate(img.id)}
                      disabled={remove.isPending}
                      title="Eliminar"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
