import type { Viewport } from "next";
import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Ribbon } from "@/components/shell/Ribbon";

/* Loaded into the sibling's variable names, not --font-display /
   --font-body / --font-mono directly: app/styles/tokens.inherited.css
   is a byte-identical copy of ../ipv-demo's token file (D-12) and
   already aliases --font-syne / --font-dm-sans / --font-jetbrains to
   --font-display / --font-body / --font-mono. Any other variable name
   here silently breaks that alias chain (D-14). One weight per
   family, matching the locked single-weight-per-family rule. */
const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0c1e35",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-ZA"
      className={`${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <Ribbon />
        {children}
      </body>
    </html>
  );
}
