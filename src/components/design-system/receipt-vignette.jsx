"use client";

import { ReceiptArt } from "./receipt-art";
import { FileText } from "./icons/animate-ui/file-text";
import styles from "./receipt-vignette.module.css";

export function ReceiptVignette({ playing = true }) {
  return (
    <ReceiptArt className={styles.art} playing={playing} scanning={false}>
      <span className={`${styles.paper} ${styles.back}`} />
      <span className={styles.paper} data-receipt-paper>
        <FileText size={20} strokeWidth={1.5} animate={false} />
        <span className={styles.rule} />
        <span className={styles.rule} />
        <span className={styles.rule} />
      </span>
    </ReceiptArt>
  );
}
