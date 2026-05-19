"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { api, apiErrorMessage } from "@/lib/api"
import type { ApiResponse, ExperienceSchedule, Locale } from "@/types"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const DAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
]

const schema = z.object({
  day_of_week: z.coerce.number().int().min(0).max(6),
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Formato HH:MM"),
  locale: z.enum(["es", "en", "pt"]),
  capacity_hint: z.coerce.number().int().min(1).max(255).optional().or(z.nan()),
  valid_from: z.string().optional().or(z.literal("")),
  valid_to: z.string().optional().or(z.literal("")),
})

type FormIn = z.input<typeof schema>
type FormOut = z.output<typeof schema>

const LOCALES: Locale[] = ["es", "en", "pt"]

export function SchedulesTab({ experienceId }: { experienceId: number }) {
  const qc = useQueryClient()

  const list = useQuery({
    queryKey: ["schedules", experienceId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ExperienceSchedule[]>>(
        "/schedule_list",
        { params: { experience_id: experienceId } }
      )
      return data.data ?? []
    },
  })

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: {
      day_of_week: 1,
      start_time: "10:00",
      locale: "es",
      capacity_hint: undefined,
      valid_from: "",
      valid_to: "",
    },
  })

  const add = useMutation({
    mutationFn: async (v: FormOut) => {
      await api.post<ApiResponse<unknown>>("/schedule_add", {
        experience_id: experienceId,
        day_of_week: v.day_of_week,
        start_time:
          v.start_time.length === 5 ? `${v.start_time}:00` : v.start_time,
        locale: v.locale,
        capacity_hint: Number.isFinite(v.capacity_hint)
          ? v.capacity_hint
          : null,
        valid_from: v.valid_from || null,
        valid_to: v.valid_to || null,
      })
    },
    onSuccess: () => {
      toast.success("Horario agregado")
      qc.invalidateQueries({ queryKey: ["schedules", experienceId] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const remove = useMutation({
    mutationFn: async (id: number) => {
      await api.post<ApiResponse<unknown>>("/schedule_delete", { id })
    },
    onSuccess: () => {
      toast.success("Horario eliminado")
      qc.invalidateQueries({ queryKey: ["schedules", experienceId] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const items = (list.data ?? []).sort(
    (a, b) =>
      a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)
  )

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Nuevo horario</CardTitle>
          <CardDescription>
            Regla semanal por día/locale del turista.
          </CardDescription>
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
                name="day_of_week"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Día</FormLabel>
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
                        {DAYS.map((d, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {d}
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
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora inicio</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="locale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Idioma del tour</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LOCALES.map((l) => (
                          <SelectItem key={l} value={l}>
                            {l.toUpperCase()}
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
                name="capacity_hint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cupo sugerido (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={255}
                        {...field}
                        value={(field.value as number | undefined) ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="valid_from"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desde</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="valid_to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hasta</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
          <CardTitle>Horarios cargados</CardTitle>
        </CardHeader>
        <CardContent>
          {list.isError && (
            <Alert variant="destructive">
              <AlertTitle>No se pudo cargar</AlertTitle>
              <AlertDescription>{apiErrorMessage(list.error)}</AlertDescription>
            </Alert>
          )}
          {list.isLoading ? (
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Sin horarios cargados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Día</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Idioma</TableHead>
                  <TableHead>Cupo</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{DAYS[s.day_of_week]}</TableCell>
                    <TableCell className="font-mono">
                      {s.start_time.slice(0, 5)}
                    </TableCell>
                    <TableCell>{s.locale.toUpperCase()}</TableCell>
                    <TableCell>{s.capacity_hint ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {s.valid_from || "—"} → {s.valid_to || "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove.mutate(s.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
