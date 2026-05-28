import type { Metadata } from "next";
import type { CSSProperties } from "react";

import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { validatePublicEnv } from "@/lib/env";
import { ToastProvider } from "@/components/ui/Toast";
import { getGym } from "@/lib/gym/getGym";
import { getGymTheme } from "@/lib/gym/theme";

export const metadata: Metadata = {
  title: "Gym Platform",
  description: "AI-powered gym performance platform",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  validatePublicEnv();
  const gym = await getGym();
  const theme = getGymTheme(gym);

  return (
    <html
      lang="en"
      style={
        {
          "--background": theme.background,
          "--foreground": theme.foreground,
          "--theme-background": theme.background,
          "--theme-foreground": theme.foreground,
          "--theme-brand": theme.brand,
          "--theme-brand-foreground": theme.brandForeground,
          "--theme-brand-soft": theme.brandSoft,
          "--theme-border": theme.border,
          "--theme-muted": theme.muted,
        } as CSSProperties
      }
    >
      <body className="antialiased" suppressHydrationWarning={true}>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
