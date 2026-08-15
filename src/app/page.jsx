import { CreateBillForm } from "@/components/create-bill-form";

const benefits = [
  ["Start instantly", "Create a shared bill without sign-up or passwords."],
  ["Add it your way", "Scan a receipt or enter an expense manually."],
  ["Settle clearly", "See exactly who owes whom and why."],
];

export default function Home() {
  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-5 py-12 sm:px-8 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <section>
        <p className="mb-4 text-sm font-bold tracking-widest text-teal-700 uppercase">
          Shared costs, simplified
        </p>
        <h1 className="max-w-2xl text-4xl leading-tight font-bold tracking-tight text-slate-950 sm:text-6xl">
          Split the bill, not the friendship.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
          Add people, scan receipts, and understand every balance—all from one
          private link.
        </p>
        <ul className="mt-10 grid gap-5 sm:grid-cols-3 lg:grid-cols-1">
          {benefits.map(([title, copy], index) => (
            <li className="flex gap-4" key={title}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-800">
                {index + 1}
              </span>
              <span>
                <strong className="block text-slate-900">{title}</strong>
                <span className="text-sm leading-6 text-slate-600">{copy}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-9"
        aria-labelledby="create-heading"
      >
        <h2
          id="create-heading"
          className="text-2xl font-bold tracking-tight text-slate-950"
        >
          Create a bill
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          You can invite everyone else after you start.
        </p>
        <CreateBillForm />
        <p className="mt-5 text-center text-xs leading-5 text-slate-500">
          Anyone with your private bill link can view it. Joining is required to
          make changes.
        </p>
      </section>
    </div>
  );
}
