"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Check, Loader2, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { api, apiErrorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { ApiResponse, ExperienceInclusion, InclusionKind } from "@/types"

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

const schema = z.object({
  text: z.string().min(2).max(255),
  kind: z.enum(["included", "excluded"]),
  sort_order: z.coerce.number().int().min(0).default(0),
})

type FormIn = z.input<typeof schema>
type FormOut = z.output<typeof schema>

export function InclusionsTab({ experienceId }: { experienceId: number }) {
  const qc = useQueryClient()

  const list = useQuery({
    queryKey: ["inclusions", experienceId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ExperienceInclusion[]>>(
        "/inclusion_list",
        { params: { experience_id: experienceId } }
      )
      return data.data ?? []
    },
  })

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: { text: "", kind: "included", sort_order: 0 },
  })

  const add = useMutation({
    mutationFn: async (v: FormOut) => {
      await api.post<ApiResponse<unknown>>("/inclusion_add", {
        experience_id: experienceId,
        ...v,
      })
    },
    onSuccess: () => {
      toast.success("Inclusión agregada")
      form.reset({ text: "", kind: form.getValues("kind"), sort_order: 0 })
      qc.invalidateQueries({ queryKey: ["inclusions", experienceId] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const remove = useMutation({
    mutationFn: async (id: number) => {
      await api.post<ApiResponse<unknown>>("/inclusion_delete", { id })
    },
    onSuccess: () => {
      toast.success("Eliminada")
      qc.invalidateQueries({ queryKey: ["inclusions", experienceId] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const items = list.data ?? []
  const included = items
    .filter((i) => i.kind === "included")
    .sort((a, b) => a.sort_order - b.sort_order)
  const excluded = items
    .filter((i) => i.kind === "excluded")
    .sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Agregar inclusión</CardTitle>
          <CardDescription>
            Indicá qué se incluye y qué no en la experiencia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => add.mutate(v))}
              className="grid gap-3 sm:grid-cols-[1fr,160px,90px,auto]"
              noValidate
            >
              <FormField
                control={form.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Texto</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Botella de agua, equipo de seguridad…"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kind"
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
                        <SelectItem value="included">Incluido</SelectItem>
                        <SelectItem value="excluded">No incluido</SelectItem>
                      </SelectContent>
                    </Select>
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
            </form>
          </Form>
        </CardContent>
      </Card>

      {list.isError && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo cargar</AlertTitle>
          <AlertDescription>{apiErrorMessage(list.error)}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <InclusionList
          title="Incluido"
          kind="included"
          items={included}
          loading={list.isLoading}
          onRemove={(id) => remove.mutate(id)}
        />
        <InclusionList
          title="No incluido"
          kind="excluded"
          items={excluded}
          loading={list.isLoading}
          onRemove={(id) => remove.mutate(id)}
        />
      </div>
    </div>
  )
}

function InclusionList({
  title,
  kind,
  items,
  loading,
  onRemove,
}: {
  title: string
  kind: InclusionKind
  items: ExperienceInclusion[]
  loading: boolean
  onRemove: (id: number) => void
}) {
  const Icon = kind === "included" ? Check : X
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon
            className={cn(
              "size-4",
              kind === "included" ? "text-emerald-600" : "text-red-600"
            )}
          />
          {title}
          <span className="text-muted-foreground ml-auto text-xs font-normal">
            {items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin items.</p>
        ) : (
          <ul className="divide-y">
            {items.map((i) => (
              <li
                key={i.id}
                className="hover:bg-muted/30 group flex items-center justify-between gap-2 py-2 text-sm transition"
              >
                <span className="flex-1">{i.text}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={() => onRemove(i.id)}
                  title="Eliminar"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
