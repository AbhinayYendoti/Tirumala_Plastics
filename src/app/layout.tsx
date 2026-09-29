import type { Metadata, Viewport } from "next";
import { Geist, Lora } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance, clerkLocalization } from "@/lib/clerk-theme";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: { default: "Tirumala Plastics", template: "%s · Tirumala Plastics" },
  description: "Daily register for loads, salaries and expenses",
  appleWebApp: { capable: true, title: "Tirumala Plastics", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#6b1a0e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider appearance={clerkAppearance} localization={clerkLocalization}>
      <html lang="en">
        <body className={`${geistSans.variable} ${lora.variable} antialiased`}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
