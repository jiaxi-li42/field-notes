import type { Metadata } from "next";
import { Nanum_Myeongjo, Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { OverlayScrollbarsInit } from "@/components/shell/OverlayScrollbarsInit";
import { TooltipProvider } from "@/components/ui/tooltip";

const nanumMyeongjo = Nanum_Myeongjo({
  variable: "--font-nanum",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 思源宋体 CN — variable font, full weight axis exposed via --font-source-han
const sourceHanSerifCN = localFont({
  src: "../public/fonts/SourceHanSerifCN-VF.otf",
  variable: "--font-source-han",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Field Notes",
  description: "A species recording log",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nanumMyeongjo.variable} ${geist.variable} ${geistMono.variable} ${sourceHanSerifCN.variable} h-full antialiased`}
    >
      <head>
        {/* Material Symbols — weight-300 outlined icons */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <OverlayScrollbarsInit />
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
