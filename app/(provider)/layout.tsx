import * as React from "react"
import { AuthGuard } from "@/components/dashboard/auth-guard"
import { ProviderHeader } from "@/components/provider/header"
import { ProviderSidebar } from "@/components/provider/sidebar"

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard requireRole="provider">
      <div className="bg-background flex min-h-screen w-full">
        <ProviderSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <ProviderHeader />
          <main className="w-full max-w-7xl flex-1 p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  )
}
