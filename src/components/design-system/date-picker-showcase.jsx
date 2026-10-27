"use client";

import { useState } from "react";
import { DatePicker, formatPickerDate } from "@/components/ui/date-picker";
import { DesignSurface } from "./primitives";
import styles from "./date-picker-showcase.module.css";

export function DatePickerShowcase() {
  const [date, setDate] = useState("2026-10-27");
  return (
    <DesignSurface id="date-picker" className={styles.showcase}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>DATE PICKER</p>
          <h3>A calmer way to choose a day.</h3>
          <p>A little glass, smooth month transitions, and useful shortcuts.</p>
        </div>
        <span className={styles.preview}>Interactive preview</span>
      </div>
      <div className={styles.example}>
        <DatePicker
          id="preview-expense-date"
          label="Expense date"
          value={date}
          onValueChange={setDate}
        />
        <p role="status">
          Selected: {formatPickerDate(date)}. Sample data only.
        </p>
      </div>
      <p className={styles.note}>
        240ms opening · 300ms month transitions · 150ms selection. Reduced
        motion keeps changes immediate.
      </p>
    </DesignSurface>
  );
}
