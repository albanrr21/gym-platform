import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gym Platform",
  description: "AI-powered gym performance platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
      <script
        src="https://ai-assistant-builder-nine.vercel.app/api/embed/d1cb9c7e-3ba4-47b9-805f-30a00b99c02e"
        data-chatbot-id="d1cb9c7e-3ba4-47b9-805f-30a00b99c02e"
        async
      ></script>
    </html>
  );
}
