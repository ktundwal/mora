import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
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
  title: {
    default: "Mora - Break the Cycle of Conflict",
    template: "%s | Mora",
  },
  description:
    "Your pocket companion for transforming relationship conflict. Move from fear of losing to fear of hurting.",
  keywords: [
    "relationship",
    "conflict resolution",
    "communication",
    "couples",
    "therapy",
    "anxious attachment",
  ],
  authors: [{ name: "Mora" }],
  creator: "Mora",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Mora",
    title: "Mora - Break the Cycle of Conflict",
    description:
      "Your pocket companion for transforming relationship conflict.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mora - Break the Cycle of Conflict",
    description:
      "Your pocket companion for transforming relationship conflict.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
