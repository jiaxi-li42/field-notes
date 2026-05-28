import type { Metadata } from "next";
import { Nanum_Myeongjo, Geist_Mono } from "next/font/google";
import "./globals.css";

const nanumMyeongjo = Nanum_Myeongjo({
  variable: "--font-nanum",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${nanumMyeongjo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Material Symbols — weight-300 outlined icons */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
