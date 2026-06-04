"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { api, apiErrorMessage } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { homePathForRole } from "@/lib/auth"
import type { ApiResponse, LoginResponse } from "@/types"

import { BrandLogo } from "@/components/brand-logo"
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
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const { login, ready, isAuthenticated, user } = useAuth()
  const [submitting, setSubmitting] = React.useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  React.useEffect(() => {
    if (ready && isAuthenticated && user) {
      router.replace(homePathForRole(user.role))
    }
  }, [ready, isAuthenticated, user, router])

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    try {
      const { data } = await api.post<ApiResponse<LoginResponse>>(
        "/login",
        values
      )
      const token = data?.data?.token
      if (!token) throw new Error("Respuesta de login sin token")
      login(token)
      const role = data.data.admin.role
      toast.success(`Bienvenido, ${data.data.admin.full_name || data.data.admin.email}`)
      router.replace(homePathForRole(role))
    } catch (err) {
      toast.error(apiErrorMessage(err, "No se pudo iniciar sesión"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <BrandLogo className="size-14" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#FAF7F0]">
            Norte Walk
          </h1>
          <p className="text-sm text-[#E5D9B6]/70">Panel administrativo</p>
        </div>
      </div>
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Iniciar sesión</CardTitle>
        <CardDescription>Ingresá con tu cuenta de administrador</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="admin@nortewalk.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Iniciar sesión
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
    </div>
  )
}
