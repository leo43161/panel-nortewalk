"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Clock, Loader2, MapPin, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { api, apiErrorMessage } from "@/lib/api"
import type { ApiResponse, ExperienceItineraryStep } from "@/types"

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
import { Textarea } from "@/components/ui/textarea"

const schema = z.object({
  step_order: z.coerce.number().int().min(1).max(99),
  title: z.string().min(2).max(180),
  description: z.string().optional().or(z.literal("")),
  duration_min: z.coerce.number().int().min(0).optional().or(z.nan()),
})

type FormIn = z.input<typeof schema>
type FormOut = z.output<typeof schema>

export function ItineraryTab({ experienceId }: { experienceId: number }) {
  const qc = useQueryClient()

  const list = useQuery({
    queryKey: ["itinerary", experienceId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ExperienceItineraryStep[]>>(
        "/itinerary_list",
        { params: { experience_id: experienceId } }
      )
      return data.data ?? []
    },
  })

  const nextOrder = (list.data?.length ?? 0) + 1

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: {
      step_order: nextOrder,
      title: "",
      description: "",
      duration_min: undefined,
    },
  })

  React.useEffect(() => {
    form.setValue("step_order", nextOrder)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextOrder])

  const add = useMutation({
    mutationFn: async (v: FormOut) => {
      await api.post<ApiResponse<unknown>>("/itinerary_add", {
        experience_id: experienceId,
        ...v,
        duration_min: Number.isFinite(v.duration_min) ? v.duration_min : null,
      })
    },
    onSuccess: () => {
      toast.success("Paso agregado")
      form.reset({
        step_order: nextOrder + 1,
        title: "",
        description: "",
        duration_min: undefined,
      })
      qc.invalidateQueries({ queryKey: ["itinerary", experienceId] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const remove = useMutation({
    mutationFn: async (id: number) => {
      await api.post<ApiResponse<unknown>>("/itinerary_delete", { id })
    },
    onSuccess: () => {
      toast.success("Paso eliminado")
      qc.invalidateQueries({ queryKey: ["itinerary", experienceId] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const items = (list.data ?? []).sort((a, b) => a.step_order - b.step_order)

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo paso del itinerario</CardTitle>
          <CardDescription>
            El orden define la secuencia. La duración es opcional por paso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => add.mutate(v))}
              className="grid gap-3 sm:grid-cols-[80px,1fr,140px,auto]"
              noValidate
            >
              <FormField
                control={form.control}
                name="step_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>#</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={99}
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
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Encuentro en la plaza"
                        {...field}
                      />
                    </FormControl>
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
                        min={0}
                        placeholder="opcional"
                        {...field}
                        value={(field.value as number | undefined) ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="sm:self-end">
                <Button type="submit" disabled={add.isPending} className="w-full">
                  {add.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  Agregar
                </Button>
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="sm:col-span-4">
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="Qué se hace en este paso (opcional)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itinerario ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {list.isError && (
            <Alert variant="destructive">
              <AlertTitle>No se pudo cargar</AlertTitle>
              <AlertDescription>
                {apiErrorMessage(list.error)}
              </AlertDescription>
            </Alert>
          )}
          {list.isLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="text-muted-foreground size-5 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center text-sm">
              <MapPin className="size-8" />
              <p>Sin pasos cargados.</p>
            </div>
          ) : (
            <ol className="relative space-y-3 border-l-2 border-dashed border-muted pl-6">
              {items.map((s) => (
                <li
                  key={s.id}
                  className="group relative"
                >
                  <span className="bg-primary text-primary-foreground absolute -left-[33px] flex size-6 items-center justify-center rounded-full text-xs font-semibold">
                    {s.step_order}
                  </span>
                  <div className="bg-card hover:bg-muted/30 flex items-start justify-between gap-3 rounded-md border p-3 transition">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <h4 className="font-medium">{s.title}</h4>
                        {s.duration_min != null && (
                          <span className="text-muted-foreground flex items-center gap-1 text-xs">
                            <Clock className="size-3" />
                            {s.duration_min} min
                          </span>
                        )}
                      </div>
                      {s.description && (
                        <p className="text-muted-foreground mt-1 text-sm">
                          {s.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => {
                        if (confirm(`¿Eliminar paso #${s.step_order}?`))
                          remove.mutate(s.id)
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
