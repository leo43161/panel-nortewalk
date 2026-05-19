import { AuthGuard } from "@/components/dashboard/auth-guard"
import { Header } from "@/components/dashboard/header"
import { Sidebar } from "@/components/dashboard/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="bg-background flex min-h-screen w-full">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="w-full max-w-7xl flex-1 p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  )
}
