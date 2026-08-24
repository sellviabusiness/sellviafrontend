import type { Metadata } from "next";
import { Outfit, Figtree } from "next/font/google";
import "./globals.css";

// Design System (docs: UX/Design System, Technical Architecture/Frontend Architecture)
// Outfit — headlines, hero copy, nav, CTA buttons, section titles
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

// Figtree — paragraphs, labels, form fields, cards, metadata
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SellVia",
  description: "SellVia",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${figtree.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
