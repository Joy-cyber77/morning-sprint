import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { AuthProvider } from "@/components/auth-provider"
import { env } from "@/lib/env"
import { ClerkProvider } from "@clerk/nextjs"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Morning Sprint - Start Your Day with Purpose",
  description: "Join a community of morning achievers. Share your daily progress and stay motivated.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Ensures `.env` is actually loaded and validated during build/start (server-side).
  // Do not log secrets. All values here are NEXT_PUBLIC_*.
  void env

  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={`font-sans antialiased`}>
          <AuthProvider>{children}</AuthProvider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  )
}
