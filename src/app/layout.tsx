import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import Header from "@/components/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://hairstyle-tryon.com"),
  title: {
    default: "Hairstyle Try On — See Yourself in a New Hairstyle",
    template: "%s | Hairstyle Try On",
  },
  description:
    "Upload a photo and try on new hairstyles with AI. See yourself in different haircuts before you cut — free, fast, works on your phone.",
  openGraph: {
    title: "Hairstyle Try On — See Yourself in a New Hairstyle",
    description:
      "Upload a photo, pick a hairstyle, and see yourself with a brand new look in seconds. Free AI hairstyle try on.",
    url: "/",
    siteName: "Hairstyle Try On",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-neutral-50 text-neutral-900">
        <Header />
        {children}
        <footer className="border-t border-neutral-200 py-6 text-center text-xs text-neutral-500">
          <p>
            © 2026 Hairstyle Try On ·{" "}
            <Link href="/" className="hover:underline">
              Hairstyle Try On
            </Link>{" "}
            ·{" "}
            <Link href="/hairstyle-changer" className="hover:underline">
              Hairstyle Changer
            </Link>{" "}
            ·{" "}
            <Link href="/hairstyle-try-on-app" className="hover:underline">
              App
            </Link>
          </p>
          <p className="mt-1">AI-generated previews for inspiration. Your photos are never stored.</p>
        </footer>
      </body>
    </html>
  );
}
