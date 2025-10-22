import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Providers from "@/providers";
import UserMenu from "@/components/UserMenu";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Game Generator",
  description: "Create and publish AI-generated Phaser games in minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white`}>
        <Providers>
          <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-xl">
                  🎮
                </span>
                <div>
                  <h1 className="text-base font-semibold text-slate-900 sm:text-lg">AI Game Generator</h1>
                  <p className="text-xs text-slate-500 sm:text-sm">Build games with AI superpowers</p>
                </div>
              </div>
              <UserMenu />
            </div>
          </nav>

          <main className="pt-20">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
