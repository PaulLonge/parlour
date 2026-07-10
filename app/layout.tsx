import type { Metadata, Viewport } from "next";
import { Playfair_Display, Poiret_One, IM_Fell_English } from "next/font/google";
import "./globals.css";

const manor = Playfair_Display({ subsets: ["latin"], variable: "--font-manor", weight: ["500", "700"] });
const deco = Poiret_One({ subsets: ["latin"], variable: "--font-deco", weight: "400" });
const seance = IM_Fell_English({ subsets: ["latin"], variable: "--font-seance", weight: "400" });

export const metadata: Metadata = {
  title: "PARLOUR",
  description: "An evening you were warned about.",
};

export const viewport: Viewport = {
  themeColor: "#161006",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // game UI — no pinch-zoom surprises mid-party
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manor.variable} ${deco.variable} ${seance.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
