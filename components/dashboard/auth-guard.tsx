"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { homePathForRole } from "@/lib/auth"
import type { Role } from "@/types"

interface AuthGuardProps {
  children: React.ReactNode
  /**
   * Si se pasa, el guard exige que el role del usuario coincida.
   * Si no coincide, redirige al home correspondiente a su rol.
   */
  requireRole?: Role
}

export function AuthGuard({ children, requireRole }: AuthGuardProps) {
  const router = useRouter()
  const { ready, isAuthenticated, user } = useAuth()

  React.useEffect(() => {
    if (!ready) return
    if (!isAuthenticated || !user) {
      router.replace("/login")
      return
    }
    if (requireRole && user.role !== requireRole) {
      router.replace(homePathForRole(user.role))
    }
  }, [ready, isAuthenticated, user, requireRole, router])

  const ok =
    ready &&
    isAuthenticated &&
    !!user &&
    (!requireRole || user.role === requireRole)

  if (!ok) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
