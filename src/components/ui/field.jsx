import { cn } from "@/lib/cn";

export function Field({ label, hint, error, className, id, ...props }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <label
      className="grid gap-2 text-sm font-semibold text-slate-800"
      htmlFor={id}
    >
      {label}
      <input
        id={id}
        aria-describedby={errorId ?? hintId}
        aria-invalid={Boolean(error)}
        className={cn(
          "min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-base font-normal shadow-sm outline-none placeholder:text-slate-400 focus:border-teal-700 focus:ring-3 focus:ring-teal-100",
          error && "border-red-600 focus:border-red-600 focus:ring-red-100",
          className,
        )}
        {...props}
      />
      {error ? (
        <span id={errorId} className="font-normal text-red-700">
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} className="font-normal text-slate-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
