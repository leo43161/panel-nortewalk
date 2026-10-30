import type { Metadata, Viewport } from "next"
import { DM_Sans, Fraunces, Poppins } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"

// Mismo sistema tipográfico que el sitio público: DM Sans (texto),
// Poppins (títulos) y Fraunces solo para el logo.
const body = DM_Sans({ variable: "--font-body", subsets: ["latin", "latin-ext"], display: "swap" })
const display = Poppins({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
  display: "swap",
})
const wordmark = Fraunces({ variable: "--font-wordmark", subsets: ["latin"], weight: ["600"], display: "swap" })

export const metadata: Metadata = {
  title: { default: "Norte Walk · Panel", template: "%s · Norte Walk" },
  description: "Panel de guías y administración de Norte Walk",
  manifest: "/site.webmanifest",
  icons: { icon: "/icons/favicon.svg", apple: "/icons/apple-touch-icon.png" },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#36462F" },
    { media: "(prefers-color-scheme: dark)", color: "#12170F" },
  ],
  viewportFit: "cover",
}

// Script inline ejecutado antes de hidratar React.
// Aplica .dark sobre <html> según la preferencia guardada (o el SO) para
// evitar el "flash" de tema claro al cargar.
const themeBootstrap = `(function(){try{var k='nw_theme';var t=localStorage.getItem(k);var sys=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=(t==='dark'||t==='light')?t:(sys?'dark':'light');var r=document.documentElement;if(resolved==='dark')r.classList.add('dark');r.style.colorScheme=resolved;}catch(e){}})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${body.variable} ${display.variable} ${wordmark.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="bg-background text-foreground min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
