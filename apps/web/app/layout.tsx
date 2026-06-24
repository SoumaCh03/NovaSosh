import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import QueryProvider from "../components/QueryProvider";
import AuthHydrator from "../components/AuthHydrator";
import { ThemeProvider } from "../components/ThemeProvider";
import AuthenticatedLayout from "../components/AuthenticatedLayout";
import { cookies } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NOVA — A Modular Social Experience",
  description: "Phase 1 MVP of the NOVA social platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialThemeClass = cookieStore.get('theme')?.value || 'dark';

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased ${initialThemeClass}`}
    >
      <body className="h-full bg-background text-foreground flex flex-col antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const localTheme = localStorage.getItem('nova_theme');
                  let resolved = 'dark';
                  if (localTheme) {
                    if (localTheme === 'SYSTEM') {
                      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                    } else {
                      resolved = localTheme === 'LIGHT' ? 'light' : 'dark';
                    }
                  } else {
                    const cookieTheme = document.cookie.match(/theme=([^;]+)/)?.[1];
                    if (cookieTheme) {
                      resolved = cookieTheme;
                    } else {
                      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                    }
                  }
                  
                  const root = document.documentElement;
                  if (resolved === 'dark') {
                    root.classList.remove('light');
                    root.classList.add('dark');
                  } else {
                    root.classList.remove('dark');
                    root.classList.add('light');
                  }
                } catch (e) {}
              })();
            `
          }}
        />
        <QueryProvider>
          <AuthHydrator>
            <ThemeProvider>
              <AuthenticatedLayout>
                {children}
              </AuthenticatedLayout>
            </ThemeProvider>
          </AuthHydrator>
        </QueryProvider>
      </body>
    </html>
  );
}

