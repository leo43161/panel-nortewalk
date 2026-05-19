"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Trash2 } from "lucide-react"
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

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: {
      step_order: 1,
      title: "",
      description: "",
      duration_min: undefined,
    },
  })

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
        step_order: (list.data?.length ?? 0) + 1,
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

  const items = (list.data ?? []).sort(
    (a, b) => a.step_order - b.step_order
  )

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Nuevo paso</CardTitle>
          <CardDescription>El orden determina la secuencia.</CardDescription>
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
                name="step_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orden</FormLabel>
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
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
                    <FormLabel>Duración (min, opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        value={(field.value as number | undefined) ?? ""}
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

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Itinerario</CardTitle>
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
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Sin pasos cargados.
            </p>
          ) : (
            <ol className="space-y-3">
              {items.map((s) => (
                <li
                  key={s.id}
                  className="flex items-start justify-between gap-3 border-b pb-3 last:border-0"
                >
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                        {s.step_order}
                      </span>
                      <h4 className="font-medium">{s.title}</h4>
                      {s.duration_min != null && (
                        <span className="text-muted-foreground text-xs">
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
                    onClick={() => remove.mutate(s.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
