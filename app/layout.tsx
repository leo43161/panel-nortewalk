import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Norte Walk Admin",
  description: "Panel de administración Norte Walk",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
