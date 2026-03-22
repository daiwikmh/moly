import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
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

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Moly — Lido MCP Server",
  description: "AI-native Lido staking via Model Context Protocol. Stake ETH, manage positions, and participate in DAO governance through 15 MCP tools.",
  icons: {
    icon: "/molylogo.png",
    apple: "/molylogo.png",
  },
  openGraph: {
    title: "Moly — Lido MCP Server",
    description: "AI-native Lido staking via Model Context Protocol. Stake ETH, manage positions, and participate in DAO governance through 15 MCP tools.",
    images: ["/molylogo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ModeProvider>{children}</ModeProvider>
      </body>
    </html>
  );
}
