import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "GOTS Lab - Inventario y Trazabilidad",
  description: "Sistema de gestión de inventario óptico y trazabilidad de experimentos para el Grupo de Óptica y Tratamiento de Señales (GOTS)",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans antialiased flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 pt-20 sm:pt-24 md:pt-28">
          {children}
        </main>
        <Footer />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
