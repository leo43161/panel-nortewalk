"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { addDays, parseISO } from "date-fns"
import { ArrowRight, DollarSign, Loader2 } from "lucide-react"

import { api, apiErrorMessage } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import type { ApiResponse, PaymentMethod } from "@/types"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const schema = z.object({
  amount_usd: z.coerce.number().positive("Debe ser mayor a 0"),
  days_added: z.coerce.number().int().min(0).max(365).default(30),
  payment_method: z.enum([
    "transfer",
    "cash",
    "mercadopago",
    "crypto",
    "other",
  ]),
  reference: z.string().max(180).optional(),
  notes: z.string().max(500).optional(),
})

type FormIn = z.input<typeof schema>
type FormOut = z.output<typeof schema>

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "transfer", label: "Transferencia" },
  { value: "cash", label: "Efectivo" },
  { value: "mercadopago", label: "MercadoPago" },
  { value: "crypto", label: "Cripto" },
  { value: "other", label: "Otro" },
]

function computeNewPaidUntil(
  current: string | null | undefined,
  days: number
): Date | null {
  if (!days || days < 0) return null
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const base =
      current && parseISO(current) > today ? parseISO(current) : today
    return addDays(base, days)
  } catch {
    return null
  }
}

export function PayDialog({
  providerId,
  paidUntil,
  monthlyFeeUsd,
}: {
  providerId: number
  paidUntil?: string | null
  monthlyFeeUsd?: number | string
}) {
  const [open, setOpen] = React.useState(false)
  const qc = useQueryClient()
  const defaultFee = Number(monthlyFeeUsd ?? 10) || 10

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount_usd: defaultFee,
      days_added: 30,
      payment_method: "transfer",
      reference: "",
      notes: "",
    },
  })

  React.useEffect(() => {
    if (open) {
      form.reset({
        amount_usd: defaultFee,
        days_added: 30,
        payment_method: "transfer",
        reference: "",
        notes: "",
      })
    }
  }, [open, defaultFee, form])

  const daysAdded = Number(form.watch("days_added") || 0)
  const newPaidUntil = React.useMemo(
    () => computeNewPaidUntil(paidUntil, daysAdded),
    [paidUntil, daysAdded]
  )

  const mutation = useMutation({
    mutationFn: async (values: FormOut) => {
      const { data } = await api.post<ApiResponse<unknown>>(
        "/subscription_pay",
        { provider_id: providerId, ...values }
      )
      return data
    },
    onSuccess: () => {
      toast.success("Pago registrado")
      qc.invalidateQueries({ queryKey: ["provider", providerId] })
      qc.invalidateQueries({ queryKey: ["provider-history", providerId] })
      qc.invalidateQueries({ queryKey: ["provider-stats", providerId] })
      qc.invalidateQueries({ queryKey: ["providers"] })
      setOpen(false)
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, "No se pudo registrar el pago"))
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants()}>
        <DollarSign className="size-4" />
        Registrar pago
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            Suma los días al vencimiento. Si el proveedor está{" "}
            <code>trial</code> o <code>suspended</code>, pasa a{" "}
            <code>active</code>.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="grid gap-4"
            noValidate
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amount_usd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto USD</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
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
                name="days_added"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Días</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={365}
                        {...field}
                        value={field.value as number}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="bg-muted/50 rounded-md border px-3 py-2 text-sm">
              <div className="text-muted-foreground flex items-center justify-between gap-2">
                <span>Vencimiento actual</span>
                <span className="font-mono">{formatDate(paidUntil)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 font-medium">
                <span className="flex items-center gap-1">
                  <ArrowRight className="size-3.5" />
                  Nuevo vencimiento
                </span>
                <span className="font-mono">
                  {newPaidUntil
                    ? newPaidUntil.toLocaleDateString("es-AR")
                    : "—"}
                </span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {METHODS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
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
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referencia</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ID transferencia / comprobante"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Opcional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={mutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Confirmar pago
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
