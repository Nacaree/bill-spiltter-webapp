import Link from "next/link";

export default function BillNotFound() {
  return (
    <section className="mx-auto max-w-lg px-5 py-24 text-center">
      <p className="text-sm font-bold text-teal-700 uppercase">404</p>
      <h1 className="mt-3 text-3xl font-bold text-slate-950">
        That bill could not be found.
      </h1>
      <p className="mt-4 text-slate-600">
        Check the private link or ask its owner to share it again.
      </p>
      <Link
        className="mt-7 inline-block font-semibold text-teal-700 underline underline-offset-4"
        href="/"
      >
        Create a new bill
      </Link>
    </section>
  );
}
