import type { Metadata } from "next";
import "./globals.css";
import "./design.css";
export const metadata: Metadata = {
  title: "Plano de Estudos",
  description:
    "Seu tempo, suas prioridades, um plano de estudos feito para você.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
