import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ModeProvider } from "./context/ModeContext";
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
  title: "Moly — Lido MCP Dashboard",
  description: "AI-native staking dashboard powered by Lido MCP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ModeProvider>
          {children}
        </ModeProvider>
      </body>
    </html>
  );
}
