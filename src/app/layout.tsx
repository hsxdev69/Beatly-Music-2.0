import type { Metadata, Viewport } from "next";
import { Yatra_One, Inter } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const yatraOne = Yatra_One({
  weight: "400",
  subsets: ["devanagari", "latin"],
  variable: "--font-yatra",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Beatly Music — Private Bollywood & Hindi Streaming",
  description: "Ad-free, private Hindi music streaming and discovery client with OLED-dark interface and offline catalogue.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Beatly Music",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#08090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${yatraOne.variable} ${inter.variable} dark`}>
      <body className="min-h-screen bg-[#08090b] text-[#f8fafc] font-sans antialiased selection:bg-[#ff4f8a]/30">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
