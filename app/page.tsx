"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { homePathForRole } from "@/lib/auth"

export default function Home() {
  const router = useRouter()
  const { ready, isAuthenticated, user } = useAuth()

  React.useEffect(() => {
    if (!ready) return
    if (!isAuthenticated || !user) {
      router.replace("/login")
    } else {
      router.replace(homePathForRole(user.role))
    }
  }, [ready, isAuthenticated, user, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="text-muted-foreground size-6 animate-spin" />
    </div>
  )
}
