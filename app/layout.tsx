import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PARLOUR",
  description: "An evening you were warned about.",
};

export const viewport: Viewport = {
  themeColor: "#14100d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // game UI — no pinch-zoom surprises mid-party
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
