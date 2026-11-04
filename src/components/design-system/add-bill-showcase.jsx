"use client";

import { useRef, useState } from "react";
import { DesignButton } from "./primitives";
import { DialogPanel } from "./form-dialog";
import { X } from "./icons/animate-ui/x";
import { BillEntryChoices, ReceiptAnimationToggle } from "./bill-entry-choices";
import styles from "./add-bill-showcase.module.css";

const directions = [
  {
    id: "quiet",
    name: "Quiet list",
    detail:
      "One shared surface. Two clear routes. A little less visual weight.",
    note: "Closest to the current drawer, with calmer rows and softer icons.",
  },
  {
    id: "spotlight",
    name: "Receipt spotlight",
    detail: "Give the receipt a little stage, with manual entry close at hand.",
    note: "A stronger first step when scanning is the main way in.",
  },
  {
    id: "tiles",
    name: "Equal tiles",
    detail:
      "Two roomy tiles. Equal emphasis. Pick the way that suits the bill.",
    note: "A more visual choice without making either route secondary.",
  },
  {
    id: "compact",
    name: "Compact actions",
    detail: "Familiar buttons and shorter copy keep everything within reach.",
    note: "The smallest drawer, with scanning as the primary action.",
  },
];

export function AddBillShowcase() {
  const [active, setActive] = useState("quiet");
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [receiptPlaying, setReceiptPlaying] = useState(true);
  const returnFocus = useRef(null);
  const direction = directions.find((item) => item.id === active);
  const animationToggle = (
    <ReceiptAnimationToggle
      playing={receiptPlaying}
      onPlayingChange={setReceiptPlaying}
    />
  );

  return (
    <div className={styles.showcase}>
      <div className={styles.intro}>
        <p>
          Receipt spotlight is shared with Screen 2. Compare the other
          directions below.
        </p>
        <span>Explorations · sample interactions</span>
      </div>
      <div className={styles.gallery}>
        {directions.map((item, index) => (
          <figure key={item.id} className={styles.option}>
            <figcaption className={styles.caption}>
              <div className={styles.captionTitle}>
                <span className={styles.number}>0{index + 1}</span>
                <h3>{item.name}</h3>
                {item.id === "spotlight" && (
                  <span className={styles.pick}>Used in Screen 2</span>
                )}
              </div>
              <p>{item.detail}</p>
            </figcaption>
            <div className={styles.stage} aria-hidden="true">
              <div className={styles.billContext}>
                <span>Weekend dinner</span>
                <span>3 people · USD</span>
              </div>
              <div className={styles.specimen}>
                <span className={styles.handle} />
                <div className={styles.specimenHeader}>
                  <p className={styles.eyebrow}>WEEKEND DINNER</p>
                  <div className={styles.titleRow}>
                    <h4>Add to the bill</h4>
                    <span className={styles.closeIcon}>
                      <X size={18} animate={false} />
                    </span>
                  </div>
                  <p className={styles.description}>
                    Choose what’s easiest. We’ll handle the math.
                  </p>
                </div>
                <div className={styles.specimenBody}>
                  <BillEntryChoices
                    direction={item.id}
                    preview
                    receiptPlaying={receiptPlaying && !open}
                  />
                </div>
              </div>
            </div>
            <div className={styles.optionFooter}>
              <p>{item.note}</p>
              <div className={styles.receiptControls}>
                <DesignButton
                  variant="secondary"
                  icon="arrow"
                  iconPosition="end"
                  onClick={(event) => {
                    returnFocus.current = event.currentTarget;
                    setNotice("");
                    setActive(item.id);
                    setOpen(true);
                  }}
                >
                  Try {item.name.toLowerCase()}
                </DesignButton>
                {item.id === "spotlight" && animationToggle}
              </div>
            </div>
          </figure>
        ))}
      </div>
      <p className={styles.guidance}>
        <strong>Receipt spotlight</strong> is the approved chooser used in
        Screen 2. Both use the same entry controls, receipt artwork and
        animation timings.
      </p>
      <DialogPanel
        open={open}
        onOpenChange={setOpen}
        kind="options"
        title="Add to the bill"
        description="Choose what’s easiest. We’ll handle the math."
        eyebrow="Weekend dinner"
        closeLabel="Close drawer preview"
        className={styles.livePanel}
        returnFocusRef={returnFocus}
      >
        <div className={styles.liveBody}>
          {direction && (
            <BillEntryChoices
              direction={direction.id}
              receiptPlaying={receiptPlaying && open}
              onSelect={(action) => {
                setNotice(
                  action === "receipt"
                    ? "Scan a receipt selected. In the bill, this opens receipt upload."
                    : "Enter manually selected. In the bill, this opens the expense form.",
                );
              }}
            />
          )}
          <div className={styles.receiptFooter}>
            <p className={styles.previewStatus} role="status">
              {notice || `${direction?.name ?? "Drawer"} · Design preview only`}
            </p>
            {active === "spotlight" && animationToggle}
          </div>
        </div>
      </DialogPanel>
    </div>
  );
}
