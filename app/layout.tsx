import "./globals.css";
import React from "react";
import Script from "next/script";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pixi Video — PixiJS v8 Creative Playground & MP4 Exporter",
  description:
    "Interactive creative coding playground for PixiJS v8 with deterministic 60 FPS MP4 video exporter and community preset library.",
  keywords: [
    "pixi",
    "pixijs",
    "creative coding",
    "webcodecs",
    "mp4 exporter",
    "webgl",
    "webgpu",
    "monaco editor",
  ],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Pixi Video — PixiJS v8 Creative Playground & MP4 Exporter",
    description:
      "Interactive creative coding playground for PixiJS v8 with deterministic 60 FPS MP4 video exporter.",
    type: "website",
    siteName: "Pixi Video",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pixi Video — PixiJS v8 Creative Playground & MP4 Exporter",
    description:
      "Interactive creative coding playground for PixiJS v8 with deterministic 60 FPS MP4 video exporter.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  );
}

