"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { ready, isAuthenticated } = useAuth()

  React.useEffect(() => {
    if (ready && !isAuthenticated) {
      router.replace("/login")
    }
  }, [ready, isAuthenticated, router])

  if (!ready || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
