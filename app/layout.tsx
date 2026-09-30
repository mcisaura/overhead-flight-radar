import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "../components/controls/theme-provider";

export const metadata: Metadata = {
  title: "Overhead — the sky above you, right now",
  description: "Discover the aircraft passing closest to you, its journey, and the weather in your sky.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased"><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}
