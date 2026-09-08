import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { VisitPing } from "@/components/VisitPing";
import { BoardShell } from "@/components/BoardShell";
import { getBoardText } from "@/lib/board";

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "kjel.me",
  description: "Kjel Schlemmer. A personal site rendered as a flip-dot sign.",
};

// The board lives here, above every route, so it persists across navigation:
// full-viewport on the landing, a masthead strip everywhere else.
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const text = await getBoardText();
  return (
    <html lang="en" className={`${plexMono.variable} h-full`}>
      <body className="min-h-full">
        <VisitPing />
        <BoardShell text={text}>{children}</BoardShell>
      </body>
    </html>
  );
}
