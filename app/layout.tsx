import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"

import { ServiceWorkerRegistration } from "@/components/service-worker"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

// Exposées en variables CSS, consommées par `--font-sans` dans globals.css.
const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "swap" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" })

export const metadata: Metadata = {
  title: {
    default: "Matronassist-ci",
    template: "%s · Matronassist-ci",
  },
  description: "Suivi périnatal simple et accessible pour la Côte d'Ivoire",
  applicationName: "Matronassist-ci",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/apple-icon",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Matronassist",
  },
  // L'application manipule des données de santé: elle n'a rien à faire dans un index.
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2ece5" },
    { media: "(prefers-color-scheme: dark)", color: "#231d19" },
  ],
  // `cover` permet à la barre de navigation basse d'atteindre le bord de l'écran,
  // les encoches étant gérées par les marges `env(safe-area-inset-*)`.
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // `suppressHydrationWarning` est requis par next-themes, qui pose la classe
    // de thème sur <html> avant l'hydratation.
    <html lang="fr" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <main className="flex-1 flex flex-col">{children}</main>
          <Toaster />
          <ServiceWorkerRegistration />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
