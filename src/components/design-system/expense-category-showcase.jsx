"use client";

import { useState } from "react";
import { expenseCategories, getExpenseCategory } from "./expense-categories";
import { ExpenseCategoryIcon } from "./expense-category-icon";
import { DesignButton } from "./primitives";
import styles from "./expense-category-showcase.module.css";

export function ExpenseCategoryShowcase({ onPreview }) {
  const [selected, setSelected] = useState("meals");
  const category = getExpenseCategory(selected);
  return (
    <section
      className={styles.showcase}
      aria-label="Animated expense categories"
    >
      <p className={styles.hint}>
        Tap an icon to replay. Choose a category to try on an expense.
      </p>
      <div
        className={styles.grid}
        role="group"
        aria-label="Expense category options"
      >
        {expenseCategories.map((option) => (
          <button
            key={option.id}
            type="button"
            className={styles.option}
            aria-pressed={selected === option.id}
            onClick={() => setSelected(option.id)}
            data-expense-category={option.id}
          >
            <ExpenseCategoryIcon
              category={option.id}
              size={28}
              className={styles.icon}
            />
            <span>{option.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.footer}>
        <span role="status">{category.label}</span>
        <DesignButton
          variant="secondary"
          icon="arrow"
          iconPosition="end"
          onClick={() => onPreview(category)}
        >
          Preview category in Atelier
        </DesignButton>
      </div>
    </section>
  );
}
