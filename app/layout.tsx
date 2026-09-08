import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { VisitPing } from "@/components/VisitPing";

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "kjel.me",
  description: "Kjel Schlemmer. A personal site rendered as a flip-dot sign.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plexMono.variable} h-full`}>
      <body className="min-h-full">
        <VisitPing />
        {children}
      </body>
    </html>
  );
}
