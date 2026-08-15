"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }) {
  return (
    <section className="mx-auto max-w-lg px-5 py-24 text-center">
      <p className="text-sm font-bold text-teal-700 uppercase">
        Something went wrong
      </p>
      <h1 className="mt-3 text-3xl font-bold text-slate-950">
        We could not load this page.
      </h1>
      <p className="mt-4 text-slate-600">
        Your bill has not been changed. Try loading it again.
      </p>
      <Button className="mt-7" onClick={reset}>
        Try again
      </Button>
    </section>
  );
}
