"use client"

import * as React from "react"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { KeyRound, Loader2, Save } from "lucide-react"
import { toast } from "sonner"

import { api, apiErrorMessage } from "@/lib/api"
import type { ApiResponse } from "@/types"

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

const schema = z
  .object({
    current_password: z.string().min(1, "Escribí tu contraseña actual"),
    new_password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .max(72, "Máximo 72 caracteres"),
    confirm_password: z.string().min(1, "Repetí la nueva contraseña"),
  })
  .refine((v) => v.new_password === v.confirm_password, {
    message: "No coincide con la contraseña nueva",
    path: ["confirm_password"],
  })
  .refine((v) => v.current_password !== v.new_password, {
    message: "Tiene que ser distinta de la actual",
    path: ["new_password"],
  })

type FormIn = z.input<typeof schema>
type FormOut = z.output<typeof schema>

export function ChangePasswordCard() {
  const [show, setShow] = React.useState(false)

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  })

  const mutation = useMutation({
    mutationFn: async (v: FormOut) => {
      await api.post<ApiResponse<unknown>>("/admin_change_password", {
        current_password: v.current_password,
        new_password: v.new_password,
      })
    },
    onSuccess: () => {
      toast.success("Listo, ya podés entrar con la contraseña nueva")
      form.reset({
        current_password: "",
        new_password: "",
        confirm_password: "",
      })
    },
    onError: (err) =>
      toast.error(apiErrorMessage(err, "No se pudo cambiar la contraseña")),
  })

  const pwType = show ? "text" : "password"
  const field = (name: "current_password" | "new_password" | "confirm_password", label: string, autoComplete: string, hint?: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={pwType} autoComplete={autoComplete} {...field} />
          </FormControl>
          {hint && <FormDescription>{hint}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4" />
          Cambiar contraseña
        </CardTitle>
        <CardDescription>Elegí una que no uses en otros sitios.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="grid max-w-md gap-4" noValidate>
            {field("current_password", "Contraseña actual", "current-password")}
            {field("new_password", "Contraseña nueva", "new-password", "Mínimo 8 caracteres.")}
            {field("confirm_password", "Repetí la contraseña nueva", "new-password")}
            <label className="text-muted-foreground flex w-fit items-center gap-2 text-sm">
              <input type="checkbox" className="accent-primary size-4" checked={show} onChange={(e) => setShow(e.target.checked)} />
              Mostrar contraseñas
            </label>
            <div>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}
                Guardar contraseña
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
