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
        <p className="text-brand mb-4 text-sm font-bold tracking-widest uppercase">
          Shared costs, simplified
        </p>
        <h1 className="text-foreground max-w-2xl text-4xl leading-tight font-bold tracking-tight sm:text-6xl">
          Split the bill, not the friendship.
        </h1>
        <p className="text-muted mt-6 max-w-xl text-lg leading-8">
          Add people, upload receipts, and understand every balance—all from one
          private link.
        </p>
        <ul className="mt-10 grid gap-5 sm:grid-cols-3 lg:grid-cols-1">
          {benefits.map(([title, copy], index) => (
            <li className="flex gap-4" key={title}>
              <span className="bg-tint text-brand flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                {index + 1}
              </span>
              <span>
                <strong className="text-foreground block">{title}</strong>
                <span className="text-muted text-sm leading-6">{copy}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="app-panel" aria-labelledby="create-heading">
        <h2
          id="create-heading"
          className="text-foreground text-2xl font-bold tracking-tight"
        >
          Create a bill
        </h2>
        <p className="text-muted mt-2 text-sm leading-6">
          You can invite everyone else after you start.
        </p>
        <CreateBillForm />
        <p className="text-muted mt-5 text-center text-xs leading-5">
          Anyone with your private bill link can view it. Joining is required to
          make changes.
        </p>
      </section>
    </div>
  );
}
