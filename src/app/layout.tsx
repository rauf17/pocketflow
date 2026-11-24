import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  applicationName: "PocketFlow",
  appleWebApp: { capable: true, title: "PocketFlow", statusBarStyle: "black-translucent" },
  title: "PocketFlow | The co-pilot for your wallet.",
  description: "Can I afford this today? PocketFlow is a decision-making companion.",
  openGraph: {
    title: "PocketFlow — The co-pilot for your wallet",
    description: "Can I afford this today? PocketFlow is a decision-making companion.",
    siteName: "PocketFlow",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "PocketFlow — The co-pilot for your wallet",
    description: "Can I afford this today? PocketFlow is a decision-making companion.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("dark font-sans antialiased", inter.variable)}>
      <body className="min-h-screen bg-background text-foreground selection:bg-primary/30">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
