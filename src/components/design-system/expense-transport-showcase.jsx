"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { DesignField } from "./primitives";
import { ExpenseCategoryIcon } from "./expense-category-icon";
import { getExpenseCategory } from "./expense-categories";
import styles from "./expense-category-showcase.module.css";

const examples = [
  { name: "Taxi to the airport", label: "Car / taxi", icon: "car" },
  { name: "Tuk-tuk home", label: "Tuk-tuk", icon: "tuk-tuk" },
  { name: "Motorbike taxi", label: "Motorbike", icon: "motorbike" },
];
const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function ExpenseTransportShowcase() {
  const id = useId();
  const [name, setName] = useState("Tuk-tuk home");
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  const category = getExpenseCategory("transport", name);
  return (
    <section
      className={styles.showcase}
      aria-label="Transport icons from expense names"
    >
      <p className={styles.hint}>
        One transport category. The name picks the ride.
      </p>
      <div
        className={styles.transportGrid}
        role="group"
        aria-label="Transport examples"
      >
        {examples.map((example) => (
          <button
            key={example.icon}
            type="button"
            className={styles.option}
            disabled={!ready}
            aria-pressed={category.icon === example.icon}
            onClick={() => setName(example.name)}
            aria-label={`Try ${example.label} expense name`}
          >
            <ExpenseCategoryIcon
              category="transport"
              name={example.name}
              size={32}
              className={styles.icon}
            />
            <span>{example.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.transportInput}>
        <DesignField
          id={`${id}-name`}
          label="Transport expense name"
          value={name}
          maxLength={120}
          readOnly={!ready}
          onChange={(event) => setName(event.target.value)}
          hint="Try tuk-tuk, tuktuk, motorbike, moto or scooter. Other names keep the car."
        />
        <button
          type="button"
          className={styles.transportPreview}
          disabled={!ready}
        >
          <ExpenseCategoryIcon
            category="transport"
            name={name}
            size={32}
            className={styles.icon}
          />
          <span>
            <span>Matched icon</span>
            <strong role="status">{category.transportLabel}</strong>
            <small>Tap to replay</small>
          </span>
        </button>
      </div>
    </section>
  );
}
