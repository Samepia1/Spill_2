import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BottomNavWrapper from "@/components/bottom-nav-wrapper";
import ThemeProvider from "@/components/theme-provider";
import TopBarIcons from "@/components/top-bar-icons";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spill",
  description: "Anonymous college confessions platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem("theme")||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <TopBarIcons />
          <main className="pb-16">{children}</main>
          <BottomNavWrapper />
        </ThemeProvider>
      </body>
    </html>
  );
}
