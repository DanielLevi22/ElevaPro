import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "@/shared/components/providers";
import "./globals.css";
// ci: trigger check registration

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Eleva Pro — Acompanhamento profissional de treino e nutrição",
  description:
    "Plataforma de gestão para personal trainers e nutricionistas com IA. Gerencie alunos, crie planos e acompanhe resultados reais.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      {/* Sem `dark` cravado aqui: o next-themes escreve a classe de tema no
          <html>, e uma classe fixa no <body> vencia essa escrita para sempre. */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
