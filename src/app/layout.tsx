import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "@/context/SessionProviderWrapper";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Yu-Gi-Brothers",
  description: "Site de l'association Yu-Gi-Brothers",

  // chAjout des icônes
  icons: {
    icon: [
      { url: "/favicon.ico" }, // legacy
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
    other: [
      { rel: "manifest", url: "/site.webmanifest" },
    ],
  },

  // Open Graph (partage réseaux sociaux)
  openGraph: {
    title: "Yu-Gi-Brothers",
    description: "Site de l'association Yu-Gi-Brothers",
    url: "https://yugibrothers.vercel.app/",
    siteName: "Yu-Gi-Brothers",
    images: [
      {
        url: "/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "Yu-Gi-Brothers logo",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },

  // Twitter card
  twitter: {
    card: "summary",
    title: "Yu-Gi-Brothers",
    description: "Site de l'association Yu-Gi-Brothers",
    images: ["/android-chrome-192x192.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <SessionProviderWrapper>
          <Toaster position="bottom-center" reverseOrder={false} />
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  );
}