import Link from "next/link";

export default function BillNotFound() {
  return (
    <section className="mx-auto max-w-lg px-5 py-24 text-center">
      <p className="text-brand text-sm font-bold uppercase">404</p>
      <h1 className="text-foreground mt-3 text-3xl font-bold">
        That bill could not be found.
      </h1>
      <p className="text-muted mt-4">
        Check the private link or ask its owner to share it again.
      </p>
      <Link
        className="text-brand mt-7 inline-block font-semibold underline underline-offset-4"
        href="/"
      >
        Create a new bill
      </Link>
    </section>
  );
}
