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
      <p className="text-sm font-bold text-teal-700 uppercase">
        Something went wrong
      </p>
      <h1 className="mt-3 text-3xl font-bold text-slate-950">
        We could not load this page.
      </h1>
      <p className="mt-4 text-slate-600">
        Try loading it again. If you were saving a change, check the bill before
        submitting it again.
      </p>
      <Button className="mt-7" onClick={retry}>
        Try again
      </Button>
    </section>
  );
}
