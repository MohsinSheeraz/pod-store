import {
  Abril_Fatface,
  Anton,
  Bebas_Neue,
  Caveat,
  Lobster,
  Montserrat,
  Pacifico,
  Permanent_Marker,
  Playfair_Display,
  Special_Elite,
} from "next/font/google";

// Fonts offered in the text tool. next/font needs literal options, so each is spelled out.
// The files only download when a design actually uses them (preload is off).
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-playfair" });
const bebas = Bebas_Neue({ subsets: ["latin"], weight: "400", display: "swap", preload: false, variable: "--font-bebas" });
const anton = Anton({ subsets: ["latin"], weight: "400", display: "swap", preload: false, variable: "--font-anton" });
const montserrat = Montserrat({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-montserrat" });
const abril = Abril_Fatface({ subsets: ["latin"], weight: "400", display: "swap", preload: false, variable: "--font-abril" });
const pacifico = Pacifico({ subsets: ["latin"], weight: "400", display: "swap", preload: false, variable: "--font-pacifico" });
const lobster = Lobster({ subsets: ["latin"], weight: "400", display: "swap", preload: false, variable: "--font-lobster" });
const marker = Permanent_Marker({ subsets: ["latin"], weight: "400", display: "swap", preload: false, variable: "--font-marker" });
const caveat = Caveat({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-caveat" });
const typewriter = Special_Elite({ subsets: ["latin"], weight: "400", display: "swap", preload: false, variable: "--font-typewriter" });

export const fontVariables = [
  playfair,
  bebas,
  anton,
  montserrat,
  abril,
  pacifico,
  lobster,
  marker,
  caveat,
  typewriter,
]
  .map((f) => f.variable)
  .join(" ");
