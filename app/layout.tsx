import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai, Geist_Mono, Sarabun } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { SessionProvider } from "@/components/SessionProvider";

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const sarabun = Sarabun({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-sarabun",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TSRM | Meeting System",
  description: "Event platform for association management, registration, and attendee experience.",
  icons: {
    icon: [
      { url: '/tsrm-logoPNG.png?v=2', type: 'image/png' },
      { url: '/favicon.ico?v=2' }
    ],
    shortcut: ['/tsrm-logoPNG.png?v=2'],
    apple: [
      { url: '/apple-touch-icon.png?v=2', sizes: '180x180', type: 'image/png' },
      { url: '/tsrm-logoPNG.png?v=2', type: 'image/png' }
    ]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="th"
      className={`${ibmPlexSansThai.variable} ${geistMono.variable} ${sarabun.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <SessionProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

