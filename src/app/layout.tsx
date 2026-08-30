import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { THEME_COLOR } from "@/lib/constants";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Island Media Co",
  description: "Connected advertising operations prototype",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: THEME_COLOR,
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en-GB">
    <body className={cn("font-sans", geist.variable)}>
      <QueryProvider>{children}</QueryProvider>
      <Toaster position="top-right" richColors />
    </body>
  </html>
);

export default RootLayout;
