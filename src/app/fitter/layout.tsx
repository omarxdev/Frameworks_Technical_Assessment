import type { Metadata, Viewport } from "next";
import { FitterShell } from "@/features/fitter/components/fitter-shell";
import { THEME_COLOR } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Island Media Field",
  description:
    "Field engineer job list, progress updates and completion proof capture.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Island Media Field",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: THEME_COLOR,
};

const FitterLayout = ({ children }: { children: React.ReactNode }) => (
  <FitterShell>{children}</FitterShell>
);

export default FitterLayout;
