import { cn } from "@/lib/cn";

export function Button({ className, variant = "primary", ...props }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-teal-700 text-white shadow-sm hover:bg-teal-800 focus-visible:outline-teal-700",
        variant === "secondary" &&
          "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus-visible:outline-slate-700",
        className,
      )}
      {...props}
    />
  );
}
