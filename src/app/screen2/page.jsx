import Link from "next/link";
import { MobileBill } from "./mobile-bill";
import styles from "./comparison.module.css";

export const metadata = {
  title: "Screen 2 · Bill previews",
  description:
    "Compare a populated bill and a fresh bill, with independent interactive previews.",
  robots: { index: false, follow: false },
};

export default async function ScreenTwoPage({ searchParams }) {
  const { preview, embedded } = await searchParams;
  if (preview === "populated" || preview === "empty")
    return (
      <MobileBill
        key={preview}
        initialState={preview}
        embedded={embedded === "1"}
      />
    );

  return (
    <div className={styles.comparison}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Screen 2</p>
        <h1>Every bill starts somewhere.</h1>
        <p>The same design, with a little history and a fresh start.</p>
      </header>
      <div className={styles.previews}>
        {[
          ["populated", "With expenses", "Populated bill preview"],
          ["empty", "Empty state", "Empty bill preview"],
        ].map(([state, label, title]) => (
          <section key={state} aria-labelledby={`preview-${state}`}>
            <div className={styles.previewHeading}>
              <h2 id={`preview-${state}`}>{label}</h2>
              <Link
                href={`/screen2?preview=${state}`}
                aria-label={`Open preview: ${title.toLowerCase()}`}
              >
                Open preview <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <iframe
              className={styles.frame}
              src={`/screen2?preview=${state}&embedded=1`}
              title={title}
              allow="clipboard-write"
              height="1000"
            />
          </section>
        ))}
      </div>
    </div>
  );
}
