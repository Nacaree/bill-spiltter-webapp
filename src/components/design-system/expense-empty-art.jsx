"use client";

import { ReceiptArt } from "./receipt-art";
import frame from "./receipt-vignette.module.css";
import styles from "./expense-empty-art.module.css";

export function ExpenseEmptyArt({ playing = true }) {
  return (
    <ReceiptArt className={frame.art} playing={playing} scanning={false}>
      <span className={styles.scene} data-receipt-paper>
        <svg
          className={styles.picture}
          viewBox="0 0 140 112"
          fill="none"
          aria-hidden="true"
        >
          <g className={styles.shadow}>
            <path
              className={styles.curl}
              d="M21 12a11 11 0 0 0-11 11v28l5-5 6 5 5-5 6 5V23a11 11 0 0 0-11-11Z"
            />
            <path
              className={styles.paper}
              d="M21 12H85a11 11 0 0 1 11 11v75l-8-6-8 6-8-6-8 6-8-6-8 6-8-6-8 6V23a11 11 0 0 0-11-11Z"
            />
            <path
              className={styles.lines}
              d="M43 30h7m8 0h24M43 42h7m8 0h19M43 54h7m8 0h24M43 66h7m8 0h16M43 78h7m8 0h8"
            />
          </g>
          <g transform="translate(-6 0)">
            <path
              className={styles.arrow}
              transform="translate(-3 0)"
              d="m109 24-16 20h9v22h14V44h9Z"
            />
            <g className={styles.shadow}>
              <circle className={styles.coinRim} cx="106" cy="80" r="26" />
              <circle className={styles.coin} cx="106" cy="80" r="21" />
              <path
                className={styles.mark}
                d="M112 70h-8a5 5 0 0 0 0 10h4a5 5 0 0 1 0 10h-8M106 66v28"
              />
            </g>
          </g>
        </svg>
      </span>
    </ReceiptArt>
  );
}
