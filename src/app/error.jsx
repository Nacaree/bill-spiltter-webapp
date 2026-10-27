"use client";

import { Button } from "@/components/ui/button";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({ error, retry }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <section className="mx-auto max-w-lg px-5 py-24 text-center">
      <p className="text-brand text-sm font-bold uppercase">
        Something went wrong
      </p>
      <h1 className="text-foreground mt-3 text-3xl font-bold">
        We could not load this page.
      </h1>
      <p className="text-muted mt-4">
        Try loading it again. If you were saving a change, check the bill before
        submitting it again.
      </p>
      <Button className="mt-7" onClick={retry}>
        Try again
      </Button>
    </section>
  );
}
