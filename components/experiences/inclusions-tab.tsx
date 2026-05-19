"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Check, Loader2, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { api, apiErrorMessage } from "@/lib/api"
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
      form.reset({ text: "", kind: "included", sort_order: 0 })
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
  const included = items.filter((i) => i.kind === "included")
  const excluded = items.filter((i) => i.kind === "excluded")

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Agregar item</CardTitle>
          <CardDescription>
            Marcá si se incluye o se excluye del tour.
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
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Texto</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Botella de agua, equipo, etc."
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
              <Button type="submit" disabled={add.isPending}>
                {add.isPending && <Loader2 className="size-4 animate-spin" />}
                Agregar
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="lg:col-span-2 grid gap-4 md:grid-cols-2">
        {list.isError && (
          <Alert variant="destructive" className="md:col-span-2">
            <AlertTitle>No se pudo cargar</AlertTitle>
            <AlertDescription>{apiErrorMessage(list.error)}</AlertDescription>
          </Alert>
        )}
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
            className={
              kind === "included"
                ? "size-4 text-emerald-600"
                : "size-4 text-red-600"
            }
          />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin items.</p>
        ) : (
          <ul className="space-y-1">
            {items
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((i) => (
                <li
                  key={i.id}
                  className="flex items-center justify-between gap-2 border-b py-1 text-sm last:border-0"
                >
                  <span>{i.text}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRemove(i.id)}
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
