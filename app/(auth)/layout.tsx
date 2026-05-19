export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#40513B] p-6">
      {/* Atmospheric brand background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 75% 25%, #E67E22 0%, transparent 35%), radial-gradient(circle at 15% 85%, #E5D9B6 0%, transparent 40%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
        style={{
          backgroundImage:
            "linear-gradient(to top, rgba(31,38,32,0.45), transparent)",
        }}
      />
      <div className="relative z-10 w-full max-w-sm">{children}</div>
    </div>
  )
}
