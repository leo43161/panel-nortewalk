import { AuthGuard } from "@/components/dashboard/auth-guard"
import { ProviderShell } from "@/components/provider/sidebar"

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireRole="provider">
      <ProviderShell>{children}</ProviderShell>
    </AuthGuard>
  )
}
