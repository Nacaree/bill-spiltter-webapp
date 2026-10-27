import Link from "next/link";

export const metadata = { title: "Bill deleted" };

export default function BillDeletedPage() {
  return (
    <section className="mx-auto max-w-lg px-5 py-20 text-center">
      <h1 className="text-foreground text-3xl font-bold">Bill deleted</h1>
      <p className="text-muted mt-4">
        The bill is no longer available to anyone. Image removal may still be
        pending.
      </p>
      <Link
        href="/"
        className="text-brand mt-6 inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
      >
        Create a new bill
      </Link>
    </section>
  );
}
