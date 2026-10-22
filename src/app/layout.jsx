import { Inter } from "next/font/google";
import Link from "next/link";
import "@/env";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: { default: "Bill Splitter", template: "%s · Bill Splitter" },
  description: "Split shared expenses fairly, without creating an account.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen font-sans antialiased`}>
        <a
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3"
          href="#main"
        >
          Skip to content
        </a>
        <header className="border-b border-slate-200 bg-white/90">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <Link
              className="text-lg font-bold tracking-tight text-slate-950"
              href="/"
            >
              Bill <span className="text-teal-700">Splitter</span>
            </Link>
            <span className="text-sm text-slate-500">No account needed</span>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
      </body>
    </html>
  );
}
