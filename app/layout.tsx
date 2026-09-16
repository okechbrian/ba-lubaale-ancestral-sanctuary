import type { Metadata } from "next";
import { Fraunces, Figtree } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Ba Lubaale Ancestral Sanctuary Kiwamirembe",
    template: "%s — Ba Lubaale Ancestral Sanctuary Kiwamirembe",
  },
  description:
    "A screened ancestral sanctuary on the Ssese Islands of Lake Victoria, Uganda — cave work, root-water cleansing, bark cloth and fibre craft, and quiet time with land and herd.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${figtree.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-ui">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
