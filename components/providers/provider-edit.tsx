"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ChevronLeft, Loader2 } from "lucide-react"

import { api, apiErrorMessage } from "@/lib/api"
import type { ApiResponse, Provider } from "@/types"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { buttonVariants } from "@/components/ui/button"
import { ProviderForm } from "@/components/providers/provider-form"

export function ProviderEdit({ id }: { id: number }) {
  const q = useQuery({
    queryKey: ["provider", id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Provider>>("/provider_get", {
        params: { id },
      })
      return data.data
    },
  })

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          href={`/providers/${id}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ChevronLeft className="size-4" />
          Volver al detalle
        </Link>
      </div>

      {q.isLoading && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        </div>
      )}

      {q.isError && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo cargar el proveedor</AlertTitle>
          <AlertDescription>{apiErrorMessage(q.error)}</AlertDescription>
        </Alert>
      )}

      {q.data && (
        <>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Editar proveedor
            </h1>
            <p className="text-muted-foreground text-sm">
              {q.data.business_name}
            </p>
          </div>
          <ProviderForm mode="edit" initial={q.data} />
        </>
      )}
    </div>
  )
}
