"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CalendarClock, Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { api, apiErrorMessage } from "@/lib/api"
import type { ApiResponse, ExperienceSchedule, Locale } from "@/types"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const DAYS_LONG = [
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

  // Resumen semanal
  const weekSummary = React.useMemo(() => {
    const map: Record<number, ExperienceSchedule[]> = {}
    items.forEach((s) => {
      ;(map[s.day_of_week] = map[s.day_of_week] || []).push(s)
    })
    return map
  }, [items])

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo horario</CardTitle>
          <CardDescription>
            Regla semanal por día/idioma. La vigencia es opcional.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => add.mutate(v))}
              className="grid gap-3 sm:grid-cols-2 md:grid-cols-6"
              noValidate
            >
              <FormField
                control={form.control}
                name="day_of_week"
                render={({ field }) => (
                  <FormItem className="md:col-span-1">
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
                        {DAYS_LONG.map((d, i) => (
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
                    <FormLabel>Hora</FormLabel>
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
                    <FormLabel>Idioma</FormLabel>
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
                    <FormLabel>Cupo</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={255}
                        placeholder="opc."
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
              <div className="md:col-span-6 flex justify-end">
                <Button type="submit" disabled={add.isPending}>
                  {add.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  Agregar horario
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Resumen semanal */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vista semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((d, i) => {
                const slots = weekSummary[i] ?? []
                return (
                  <div
                    key={i}
                    className="bg-muted/30 rounded-md border p-2 text-center"
                  >
                    <div className="text-muted-foreground text-[11px] font-medium uppercase">
                      {d}
                    </div>
                    {slots.length === 0 ? (
                      <div className="text-muted-foreground mt-1 text-xs">—</div>
                    ) : (
                      <div className="mt-1 flex flex-col gap-0.5">
                        {slots.slice(0, 3).map((s) => (
                          <span
                            key={s.id}
                            className="bg-background rounded px-1 font-mono text-[11px]"
                          >
                            {s.start_time.slice(0, 5)}
                          </span>
                        ))}
                        {slots.length > 3 && (
                          <span className="text-muted-foreground text-[10px]">
                            +{slots.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Horarios cargados ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {list.isError && (
            <Alert variant="destructive" className="m-4">
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
              <CalendarClock className="size-8" />
              <p>Sin horarios cargados.</p>
            </div>
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
                  <TableRow key={s.id} className="group">
                    <TableCell>{DAYS_LONG[s.day_of_week]}</TableCell>
                    <TableCell className="font-mono">
                      {s.start_time.slice(0, 5)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.locale.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {s.capacity_hint ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {s.valid_from || "—"} → {s.valid_to || "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="opacity-0 group-hover:opacity-100"
                        onClick={() => {
                          if (confirm("¿Eliminar este horario?"))
                            remove.mutate(s.id)
                        }}
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
