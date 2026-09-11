import type { Metadata } from "next";
import { Geist, Geist_Mono, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Same display face the embedded Assessment Tool (public/tool.html) already
// uses for its own headers/labels — used here for page titles and stat
// numbers so the hub's chrome and the tool it embeds read as one product.
const barlowCondensed = Barlow_Condensed({
  variable: "--font-display",
  weight: ["600", "700", "900"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Adjust Health OS",
  description: "Adjust Health internal operating system — weekly input, KPI dashboards, and provider meetings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
