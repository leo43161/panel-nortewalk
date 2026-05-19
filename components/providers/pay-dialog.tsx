"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { DollarSign, Loader2 } from "lucide-react"

import { api, apiErrorMessage } from "@/lib/api"
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
  amount_usd: z.coerce.number().positive("Debe ser > 0"),
  days_added: z.coerce.number().int().min(0).max(365).default(30),
  payment_method: z.enum([
    "transfer",
    "cash",
    "mercadopago",
    "crypto",
    "other",
  ]),
  reference: z.string().optional(),
  notes: z.string().optional(),
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

export function PayDialog({ providerId }: { providerId: number }) {
  const [open, setOpen] = React.useState(false)
  const qc = useQueryClient()

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount_usd: 10,
      days_added: 30,
      payment_method: "transfer",
      reference: "",
      notes: "",
    },
  })

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
      form.reset()
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
            Suma <code>días_added</code> al <code>paid_until</code>. Si estaba
            suspended o trial, pasa a active.
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
                    <Input placeholder="ID transferencia / comprobante" {...field} />
                  </FormControl>
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
                    <Input {...field} />
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
