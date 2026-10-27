import { SiteHeader } from "@/components/site-header";
import "@/env";
import "@/components/design-system/tokens.css";
import "./globals.css";

export const metadata = {
  title: { default: "Bill Splitter", template: "%s · Bill Splitter" },
  description: "Split shared expenses fairly, without creating an account.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <a
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3"
          href="#main"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
      </body>
    </html>
  );
}
