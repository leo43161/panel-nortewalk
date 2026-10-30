import { AuthGuard } from "@/components/dashboard/auth-guard"
import { AdminShell } from "@/components/dashboard/sidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireRole="admin">
      <AdminShell>{children}</AdminShell>
    </AuthGuard>
  )
}
