import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dashboard de Conteo",
  description:
    "Visualización en tiempo real del conteo acumulado y promedio por minuto y hora.",
};

import { DemoProvider } from "@/lib/demo-context";
import { DemoWizard } from "@/components/demo-wizard";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--background)]`}
      >
        <DemoProvider>
          <DemoWizard />
          {children}
        </DemoProvider>
      </body>
    </html>
  );
}
