import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YKlipp - Highlight Extractor",
  description: "Extract the best moments from your videos automatically",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
