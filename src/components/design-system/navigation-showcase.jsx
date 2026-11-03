"use client";

import { useState } from "react";
import { BillNavigation, billNavigationItems } from "./bill-navigation";
import styles from "./navigation-showcase.module.css";

const destinations = billNavigationItems;
const options = [
  {
    id: "floating",
    title: "Floating dock",
    description:
      "An inset surface with a soft shadow and a small icon highlight.",
  },
  {
    id: "quiet",
    title: "Quiet bar",
    description:
      "A flat surface with a soft lavender highlight that slides between icons.",
  },
  {
    id: "compact",
    title: "Compact capsule",
    description:
      "Icons beside labels, with a sliding selection and less height.",
  },
];
const content = {
  Overview: {
    label: "You’re owed",
    amount: "$32.00",
    detail: "From 2 people in this bill",
  },
  Expenses: {
    label: "Dinner at the little place",
    amount: "$48.00",
    detail: "Paid by you · split equally",
  },
  Settle: {
    label: "Sokha owes you",
    amount: "$16.00",
    detail: "1 of 2 suggested payments",
  },
};

export function NavigationShowcase() {
  const [selected, setSelected] = useState("Overview");
  const sample = content[selected];

  return (
    <div className={styles.showcase}>
      <p className={styles.intro}>
        Try each section. All three previews stay in sync for comparison.
      </p>
      <div className={styles.options}>
        {options.map((option) => (
          <figure key={option.id} className={styles.option}>
            <figcaption className={styles.caption}>
              <h3>{option.title}</h3>
              <p>{option.description}</p>
            </figcaption>
            <div className={styles.phone} data-navigation-preview={option.id}>
              <div className={styles.content}>
                <p className={styles.eyebrow}>WEEKEND DINNER</p>
                <h4>{selected}</h4>
                <div className={styles.sample}>
                  <p>{sample.label}</p>
                  <strong>{sample.amount}</strong>
                  <p>{sample.detail}</p>
                </div>
              </div>
              {option.id === "quiet" ? (
                <BillNavigation
                  value={selected.toLowerCase()}
                  onValueChange={(id) =>
                    setSelected(
                      destinations.find((item) => item.id === id).label,
                    )
                  }
                  className={styles.quietPreview}
                  label="Quiet bar bill sections"
                />
              ) : (
                <nav
                  className={`${styles.navigation} ${styles[option.id]}`}
                  aria-label={`${option.title} bill sections`}
                >
                  <div
                    className={styles.track}
                    style={{
                      "--navigation-selected": destinations.findIndex(
                        (item) => item.label === selected,
                      ),
                    }}
                  >
                    {option.id === "compact" && (
                      <span className={styles.selection} aria-hidden="true" />
                    )}
                    {destinations.map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        className={styles.destination}
                        aria-current={selected === label ? "page" : undefined}
                        onClick={() => setSelected(label)}
                      >
                        <span className={styles.symbol} aria-hidden="true">
                          <Icon size={20} animate={false} />
                        </span>
                        <span className={styles.label}>{label}</span>
                      </button>
                    ))}
                  </div>
                </nav>
              )}
            </div>
          </figure>
        ))}
      </div>
      <p className={styles.note} role="status">
        Previewing {selected}. Quiet bar is the navigation used in Screen 2.
      </p>
    </div>
  );
}
