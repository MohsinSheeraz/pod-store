import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import "./globals.css";
import Providers from "@/components/layout/Providers";
import { SITE } from "@/lib/site";
import { fontVariables } from "@/lib/fonts";
import { siteUrl } from "@/lib/env";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = Instrument_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  twitter: { card: "summary", title: `${SITE.name} — ${SITE.tagline}`, description: SITE.description },
};

// Sets the saved (or the system) theme before first paint, so there is no flash of the wrong one.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(!t){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})()`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${fontVariables}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
