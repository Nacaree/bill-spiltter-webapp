"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/money";
import { DesignButton } from "./primitives";
import { ExpenseSearch } from "./expense-search";
import { sampleExpenses } from "./expense-preview-data";
import { Coffee } from "./icons/animate-ui/coffee";
import { Route } from "./icons/animate-ui/route";
import styles from "./expense-search-showcase.module.css";

const designs = [
  {
    id: "line",
    name: "Quiet line",
    description: "Just an icon, a little space and a fine underline.",
  },
  {
    id: "tint",
    name: "Liquid glass",
    description:
      "The shared frosted glass material, with a purple search icon.",
  },
  {
    id: "frame",
    name: "Paper frame",
    description: "A crisp white field with a fine border and smaller corners.",
  },
  {
    id: "toolbar",
    name: "Integrated toolbar",
    description: "Search and filters sit together on one compact surface.",
  },
];

function SearchOption({ design, index, selected, onPreview }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const matches = sampleExpenses.filter(
    (item) =>
      (filter !== "Paid by you" || item.payer === "Nary") &&
      (filter !== "Receipts" || item.receipt) &&
      `${item.name} ${item.payer} ${item.category}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );

  return (
    <figure className={styles.option} data-search-option={design.id}>
      <figcaption className={styles.caption}>
        <span className={styles.number}>0{index + 1}</span>
        <h3>{design.name}</h3>
        <p>{design.description}</p>
      </figcaption>
      <div className={styles.stage}>
        <div className={styles.context}>
          <span>WEEKEND DINNER</span>
          <span>$102.00 total</span>
        </div>
        <div className={styles.title}>
          <span>Expenses</span>
          <span>03</span>
        </div>
        <ExpenseSearch
          design={design.id}
          value={query}
          onValueChange={setQuery}
          filter={filter}
          onFilterChange={setFilter}
          label={`Search ${design.name.toLowerCase()} expenses`}
        />
        <p role="status" className={styles.resultCount}>
          {matches.length
            ? `${matches.length} ${matches.length === 1 ? "expense" : "expenses"}`
            : "No matching expenses"}
        </p>
        <ul className={styles.results}>
          {matches.map((item) => {
            const Icon = item.category === "Transport" ? Route : Coffee;
            return (
              <li key={item.id}>
                <span className={styles.categoryIcon} aria-hidden="true">
                  <Icon size={18} animate={false} />
                </span>
                <span className={styles.expenseCopy}>
                  <strong>{item.name}</strong>
                  <span>Paid by {item.payer}</span>
                </span>
                <strong className={styles.amount}>
                  {formatMoney(item.amount, "USD")}
                </strong>
              </li>
            );
          })}
        </ul>
        {!matches.length && (
          <p className={styles.noResults}>
            Try a name like Nary, or show all expenses.
          </p>
        )}
      </div>
      <div className={styles.optionFooter}>
        <DesignButton
          variant="secondary"
          icon="arrow"
          iconPosition="end"
          className={styles.previewButton}
          aria-label={`Preview in Atelier: ${design.name}`}
          aria-pressed={selected}
          onClick={() => onPreview(design.id)}
        >
          Preview in Atelier
        </DesignButton>
        <span>
          {selected ? "Shown in Atelier" : "Try typing coffee or Sokha"}
        </span>
      </div>
    </figure>
  );
}

export function ExpenseSearchShowcase({ activeDesign, onPreview }) {
  return (
    <div className={styles.gallery}>
      {designs.map((design, index) => (
        <SearchOption
          key={design.id}
          design={design}
          index={index}
          selected={activeDesign === design.id}
          onPreview={onPreview}
        />
      ))}
    </div>
  );
}
