import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lavine / Archive",
  description: "Interactive cinematic prologue for Lavine Xie.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
