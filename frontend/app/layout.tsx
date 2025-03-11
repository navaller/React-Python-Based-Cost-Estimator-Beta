import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MainSidebarLayout from "@/components/main-sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CAD Manager",
  description: "Manage CAD files and projects",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex`}
      >
        <div className="flex w-full">
          <MainSidebarLayout>
            <main className="flex-1 p-6">{children}</main>
          </MainSidebarLayout>
        </div>
      </body>
    </html>
  );
}
