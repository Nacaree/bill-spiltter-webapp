"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, retry }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'Helvetica, "Helvetica Neue", Arial, sans-serif',
          color: "#272231",
          background: "#f7f6fa",
          padding: "2rem",
          maxWidth: "36rem",
          margin: "auto",
        }}
      >
        <h1
          style={{
            fontFamily: "inherit",
            fontWeight: 700,
          }}
        >
          We couldn’t load this page.
        </h1>
        <p>
          Try again. If you were saving a change, check the bill before
          submitting it again.
        </p>
        <button
          type="button"
          onClick={retry}
          style={{
            background: "#663399",
            color: "white",
            border: 0,
            borderRadius: 22,
            minHeight: 48,
            padding: "12px 24px",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        <p>
          <Link href="/">Go to home page</Link>
        </p>
      </body>
    </html>
  );
}
