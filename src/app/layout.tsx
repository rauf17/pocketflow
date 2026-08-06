import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: "PocketFlow | The co-pilot for your wallet.",
  description: "Can I afford this today? PocketFlow is a decision-making companion.",
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
      </body>
    </html>
  );
}
