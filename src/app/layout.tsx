import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PL Rooms",
  description: "Temporary match chatrooms for Premier League fixtures",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-100 antialiased">{children}</body>
    </html>
  );
}
