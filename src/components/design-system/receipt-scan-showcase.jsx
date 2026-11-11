"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import { DesignButton } from "./primitives";
import { ReceiptArt } from "./receipt-art";
import { Check } from "./icons/animate-ui/check";
import { Upload } from "./icons/animate-ui/upload";
import { formatMoney, parseMoneyToMinor } from "@/lib/money";
import receiptPhotoExample from "./assets/receipt-photo-example.webp";
import styles from "./receipt-scan-showcase.module.css";

const directions = [
  {
    id: "spotlight",
    name: "Receipt spotlight",
    description: "A little breathing room. One clear next step.",
    note: "A natural companion to the Add to bill drawer, with a softer introduction to scanning.",
  },
  {
    id: "guided",
    name: "A little guidance",
    description: "See the steps before you start.",
    note: "A visible path from photo to shared expense, with helpful guidance along the way.",
  },
  {
    id: "camera",
    name: "Ready for a close-up",
    description: "The receipt gets the whole stage.",
    note: "A photo-led layout that puts taking a picture first and keeps uploading close by.",
  },
];
const stages = ["Upload", "Scanning", "Review"];
const sampleItems = [
  { id: "amok", name: "Fish amok", amount: "22.00", people: "Everyone" },
  { id: "greens", name: "Morning glory", amount: "8.00", people: "Everyone" },
  { id: "tea", name: "Iced tea", amount: "9.00", people: "Everyone" },
];
const money = (amount) => formatMoney(amount, "USD");
const subscribeReady = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

function ScanIcon({ name, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "camera" ? (
        <>
          <path d="M8 5 6.5 8H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2.5L16 5Z" />
          <circle cx="12" cy="14" r="4" />
        </>
      ) : name === "back" ? (
        <path d="m14 6-6 6 6 6M8 12h13" />
      ) : (
        <>
          <path d="M4 8V4h4m8 0h4v4M4 16v4h4m8 0h4v-4M4 12h16" />
        </>
      )}
    </svg>
  );
}

function PaperReceipt({ playing, scanning }) {
  return (
    <ReceiptArt
      className={styles.paperArt}
      playing={playing}
      scanning={scanning}
    >
      <span className={styles.paper} data-receipt-paper>
        <span className={styles.merchant}>MALIS</span>
        <span className={styles.location}>PHNOM PENH</span>
        <span className={styles.paperRule} data-receipt-line />
        {sampleItems.map((item) => (
          <span key={item.id} className={styles.paperItem}>
            <span>{item.name}</span>
            <b>{item.amount}</b>
          </span>
        ))}
        <span className={styles.paperRule} data-receipt-line />
        <span className={styles.paperTotal}>
          <span>TOTAL</span>
          <b>$39.00</b>
        </span>
        <span className={styles.thanks}>A LITTLE MEAL, WELL SHARED.</span>
        {scanning && <span className={styles.scanBeam} data-receipt-scan />}
      </span>
    </ReceiptArt>
  );
}

function ScanConcept({ direction, playing }) {
  const id = useId();
  const [stage, setStage] = useState("Upload");
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [filename, setFilename] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [items, setItems] = useState(sampleItems);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const fileInput = useRef(null);
  const cameraInput = useRef(null);
  const heading = useRef(null);
  const focusNext = useRef(false);

  useEffect(() => {
    const source = photo?.src;
    return () => {
      if (typeof source === "string" && source.startsWith("blob:"))
        URL.revokeObjectURL(source);
    };
  }, [photo]);

  useEffect(() => {
    if (!autoAdvance || stage !== "Scanning") return;
    const timer = setTimeout(() => {
      focusNext.current = true;
      setStage("Review");
      setAutoAdvance(false);
    }, 2400);
    return () => clearTimeout(timer);
  }, [autoAdvance, stage]);

  useEffect(() => {
    if (focusNext.current) {
      heading.current?.focus({ preventScroll: true });
      focusNext.current = false;
    }
  }, [stage, added]);

  function changeStage(next, focus = false) {
    focusNext.current = focus;
    setAutoAdvance(false);
    setError("");
    setAdded(false);
    setStage(next);
  }

  function scanExample() {
    focusNext.current = true;
    setError("");
    setAdded(false);
    setItems(sampleItems);
    if (direction.id === "camera" && (!photo || photoFailed)) {
      setPhoto({ src: receiptPhotoExample, example: true });
      setFilename("Example receipt photo");
      setPhotoFailed(false);
    }
    setStage("Scanning");
    setAutoAdvance(true);
  }

  function selectFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose an image that’s 10 MB or smaller.");
      return;
    }
    if (
      !/\.(jpe?g|png|hei[cf])$/i.test(file.name) &&
      !/^image\/(jpeg|png|heic|heif)$/.test(file.type)
    ) {
      setError("Choose a JPG, PNG or HEIC image.");
      return;
    }
    setError("");
    setFilename(file.name);
    setPhoto({ src: URL.createObjectURL(file), example: false });
    setPhotoFailed(false);
  }

  function showPhotoExample() {
    setPhoto({ src: receiptPhotoExample, example: true });
    setFilename("Example receipt photo");
    setPhotoFailed(false);
    setItems(sampleItems);
    changeStage("Upload", true);
  }

  function resetReceipt() {
    setFilename("");
    setPhoto(null);
    setPhotoFailed(false);
    setItems(sampleItems);
    changeStage("Upload", true);
  }

  function updateItem(itemId, key, value) {
    setError("");
    setItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, [key]: value } : item,
      ),
    );
  }

  let total = 0;
  let valid = true;
  for (const item of items) {
    try {
      total += parseMoneyToMinor(item.amount, "USD");
      if (!item.name.trim()) valid = false;
    } catch {
      valid = false;
    }
  }
  if (!Number.isSafeInteger(total)) valid = false;

  const title = added
    ? "All shared. All set."
    : stage === "Review"
      ? "A quick check, then share."
      : stage === "Scanning"
        ? "Finding the little details…"
        : photo
          ? "Ready for a quick scan."
          : direction.id === "guided"
            ? "From receipt to shared."
            : "One receipt. Less typing.";
  const help = added
    ? "Your receipt is ready in the bill."
    : stage === "Review"
      ? "Check the items and choose who shared what."
      : stage === "Scanning"
        ? "Reading the items and adding up the total."
        : photo
          ? "Make sure the items and total are easy to read."
          : "Bring the receipt. We’ll help with everyone’s share.";
  const textFirst = direction.id === "camera" && !added;
  const headingContent = (
    <div className={styles.heading}>
      <span className={styles.eyebrow}>
        {added
          ? "RECEIPT ADDED"
          : stage === "Review"
            ? "LOOKING GOOD"
            : stage === "Scanning"
              ? "A LITTLE HELP WITH THE MATH"
              : "SCAN A RECEIPT"}
      </span>
      <h4 ref={heading} tabIndex={-1}>
        {title}
      </h4>
      <p>{help}</p>
    </div>
  );

  return (
    <figure className={styles.option} data-scan-concept={direction.id}>
      <figcaption className={styles.caption}>
        <span className={styles.optionNumber}>
          0{directions.indexOf(direction) + 1}
        </span>
        <h3>{direction.name}</h3>
        <p>{direction.description}</p>
      </figcaption>
      <div
        className={styles.stagePicker}
        role="group"
        aria-label={`${direction.name} preview stage`}
      >
        {stages.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={stage === item && !added}
            onClick={() => changeStage(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <section
        className={`${styles.phone} ${styles[direction.id]}`}
        aria-label={`${direction.name} interactive preview`}
      >
        <header className={styles.pageHeader}>
          <button
            type="button"
            className={styles.back}
            aria-label={
              stage === "Upload"
                ? "Reset receipt preview"
                : "Back to receipt upload"
            }
            onClick={resetReceipt}
          >
            <ScanIcon name="back" />
          </button>
          <span>WEEKEND DINNER</span>
          <span className={styles.headerMark}>
            <ScanIcon name="scan" size={18} />
          </span>
        </header>
        {direction.id === "guided" && (
          <ol className={styles.steps} aria-label="Receipt steps">
            {["Add receipt", "Check items", "Share"].map((step, index) => (
              <li
                key={step}
                aria-current={
                  index === (added ? 2 : stage === "Review" ? 1 : 0)
                    ? "step"
                    : undefined
                }
              >
                <span>{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        )}
        <div className={styles.pageContent}>
          {textFirst && headingContent}
          {stage !== "Review" && !added && (
            <div className={styles.receiptScene} data-photo={Boolean(photo)}>
              {direction.id === "camera" && (
                <>
                  <span className={styles.frameCorner} />
                  <span className={styles.frameCorner} />
                  <span className={styles.frameCorner} />
                  <span className={styles.frameCorner} />
                  <span className={styles.frameLabel}>
                    {stage === "Scanning"
                      ? "READING YOUR RECEIPT"
                      : photo
                        ? "YOUR RECEIPT · FULL PHOTO"
                        : "KEEP ALL FOUR CORNERS IN VIEW"}
                  </span>
                </>
              )}
              {photo ? (
                <div className={styles.receiptPhoto}>
                  <div className={styles.photoViewport}>
                    {photoFailed ? (
                      <div className={styles.photoUnavailable}>
                        <ScanIcon name="scan" size={28} />
                        <strong>Photo preview unavailable</strong>
                        <span>Try a JPG or PNG image.</span>
                      </div>
                    ) : (
                      <>
                        <Image
                          src={photo.src}
                          alt={
                            photo.example
                              ? "Example restaurant receipt photo"
                              : "Your selected receipt photo"
                          }
                          fill
                          unoptimized
                          sizes="(max-width: 700px) 340px, 300px"
                          className={styles.photoImage}
                          onError={() => setPhotoFailed(true)}
                        />
                        {stage === "Scanning" && (
                          <span
                            className={styles.photoSweep}
                            data-playing={playing}
                            aria-hidden="true"
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <PaperReceipt
                  playing={playing}
                  scanning={stage === "Scanning"}
                />
              )}
              {direction.id === "spotlight" && !photo && (
                <span className={styles.sceneBadge}>
                  <ScanIcon name="scan" size={18} />
                </span>
              )}
            </div>
          )}
          {added && (
            <div className={styles.successMark}>
              <Check size={32} animate={playing} />
            </div>
          )}
          {!textFirst && headingContent}
          {added ? (
            <div className={styles.successSummary}>
              <span>
                Malis Phnom Penh
                <small>{items.length} items · shared your way</small>
              </span>
              <strong>{money(total)}</strong>
            </div>
          ) : stage === "Review" ? (
            <form
              id={`${id}-review`}
              className={styles.review}
              onSubmit={(event) => {
                event.preventDefault();
                if (!valid) {
                  setError("Give each item a name and a valid amount.");
                  return;
                }
                focusNext.current = true;
                setAdded(true);
              }}
            >
              {photo && !photoFailed && (
                <details className={styles.originalReceipt}>
                  <summary>
                    <Image
                      src={photo.src}
                      alt=""
                      width={32}
                      height={42}
                      unoptimized
                      className={styles.photoThumbnail}
                    />
                    <span>
                      Original receipt<small>{filename}</small>
                    </span>
                    <span className={styles.viewPhoto}>View photo</span>
                  </summary>
                  <div className={styles.reviewPhoto}>
                    <Image
                      src={photo.src}
                      alt="Original receipt for comparison"
                      fill
                      unoptimized
                      sizes="(max-width: 700px) 340px, 300px"
                      className={styles.photoImage}
                    />
                  </div>
                </details>
              )}
              {photo && !photo.example && (
                <p className={styles.exampleNotice}>
                  This design preview uses example items.
                </p>
              )}
              <div className={styles.reviewMerchant}>
                <span className={styles.merchantIcon}>
                  <ScanIcon name="scan" />
                </span>
                <span>
                  <strong>Malis Phnom Penh</strong>
                  <small>Paid by Nary · USD</small>
                </span>
              </div>
              {items.map((item, index) => (
                <div className={styles.reviewItem} key={item.id}>
                  <label className={styles.itemName}>
                    <span className={styles.srOnly}>Item {index + 1} name</span>
                    <input
                      value={item.name}
                      required
                      onChange={(event) =>
                        updateItem(item.id, "name", event.target.value)
                      }
                    />
                  </label>
                  <label className={styles.itemAmount}>
                    <span className={styles.srOnly}>
                      Item {index + 1} amount in USD
                    </span>
                    <span aria-hidden="true">$</span>
                    <input
                      value={item.amount}
                      inputMode="decimal"
                      required
                      onChange={(event) =>
                        updateItem(item.id, "amount", event.target.value)
                      }
                    />
                  </label>
                  <label className={styles.splitChoice}>
                    <span>Split with</span>
                    <select
                      aria-label={`Split item ${index + 1} with`}
                      value={item.people}
                      onChange={(event) =>
                        updateItem(item.id, "people", event.target.value)
                      }
                    >
                      <option>Everyone</option>
                      <option>Nary & Sokha</option>
                      <option>Nary & Mali</option>
                      <option>Nary</option>
                    </select>
                  </label>
                </div>
              ))}
              <div className={styles.total}>
                <span>Receipt total</span>
                <strong>{valid ? money(total) : "—"}</strong>
              </div>
            </form>
          ) : stage === "Scanning" ? (
            <div className={styles.scanProgress} role="status">
              <span className={styles.progressTrack} data-playing={playing}>
                <span />
              </span>
              <span>
                Finding items
                <small>You’ll check everything before it’s added.</small>
              </span>
            </div>
          ) : (
            <div className={styles.uploadDetails}>
              {filename ? (
                <div className={styles.selectedFile}>
                  <Upload size={18} animate={false} />
                  <span>
                    {filename}
                    <small>Ready for the sample scan</small>
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                  >
                    Change
                  </button>
                </div>
              ) : direction.id === "guided" ? (
                <div className={styles.photoTip}>
                  <span className={styles.tipIcon}>
                    <ScanIcon name="camera" />
                  </span>
                  <p>
                    <strong>A clear photo goes a long way.</strong>
                    <span>
                      Lay it flat, find good light, and include the total.
                    </span>
                  </p>
                </div>
              ) : direction.id !== "camera" ? (
                <p className={styles.fileHint}>
                  A clear photo is all you need.
                </p>
              ) : null}
            </div>
          )}
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
        </div>
        <footer className={styles.pageFooter}>
          {added ? (
            <DesignButton
              variant="secondary"
              icon="replay"
              onClick={resetReceipt}
            >
              Try another receipt
            </DesignButton>
          ) : stage === "Review" ? (
            <>
              <DesignButton type="submit" form={`${id}-review`} icon="check">
                Add to bill · {valid ? money(total) : "—"}
              </DesignButton>
              <span className={styles.footerHint}>
                Your balance updates after you confirm.
              </span>
            </>
          ) : stage === "Scanning" ? (
            <DesignButton
              variant="ghost"
              onClick={() => changeStage("Upload", true)}
            >
              Cancel scan
            </DesignButton>
          ) : (
            <>
              <DesignButton
                icon={
                  photoFailed
                    ? "upload"
                    : filename
                      ? "arrow"
                      : direction.id === "spotlight"
                        ? "upload"
                        : undefined
                }
                onClick={() =>
                  photoFailed
                    ? fileInput.current?.click()
                    : filename
                      ? scanExample()
                      : (direction.id === "spotlight"
                          ? fileInput
                          : cameraInput
                        ).current?.click()
                }
              >
                {!filename && !photoFailed && direction.id !== "spotlight" && (
                  <ScanIcon name="camera" />
                )}
                {photoFailed
                  ? "Choose a different image"
                  : filename
                    ? "Scan receipt"
                    : direction.id === "spotlight"
                      ? "Choose receipt image"
                      : "Take a photo"}
              </DesignButton>
              {direction.id !== "spotlight" && !filename && (
                <DesignButton
                  variant="ghost"
                  icon="upload"
                  onClick={() => fileInput.current?.click()}
                >
                  Choose from photos
                </DesignButton>
              )}
              {photo && !photoFailed && (
                <DesignButton
                  variant="ghost"
                  onClick={() => cameraInput.current?.click()}
                >
                  <ScanIcon name="camera" /> Retake photo
                </DesignButton>
              )}
              <span className={styles.footerHint}>
                JPG, PNG or HEIC · up to 10 MB
              </span>
            </>
          )}
        </footer>
        <input
          ref={fileInput}
          hidden
          type="file"
          accept=".jpg,.jpeg,.png,.heic,.heif,image/jpeg,image/png,image/heic,image/heif"
          aria-label="Choose receipt image"
          onChange={selectFile}
        />
        <input
          ref={cameraInput}
          hidden
          type="file"
          accept="image/jpeg,image/png,image/heic,image/heif"
          capture="environment"
          aria-label="Take receipt photo"
          onChange={selectFile}
        />
      </section>
      <div className={styles.optionFooter}>
        <p>{direction.note}</p>
        {direction.id === "camera" && (
          <DesignButton
            variant="secondary"
            icon="upload"
            onClick={showPhotoExample}
          >
            Preview a receipt photo
          </DesignButton>
        )}
        <DesignButton variant="secondary" icon="replay" onClick={scanExample}>
          Try an example receipt
        </DesignButton>
      </div>
    </figure>
  );
}

export function ReceiptScanShowcase() {
  const [playing, setPlaying] = useState(true);
  const ready = useSyncExternalStore(subscribeReady, clientReady, serverReady);
  return (
    <fieldset className={styles.showcase} disabled={!ready}>
      <legend className={styles.srOnly}>
        Receipt scanning design previews
      </legend>
      <div className={styles.intro}>
        <div>
          <span className={styles.explorationLabel}>
            THREE DIRECTIONS · ONE SHARED BILL
          </span>
          <p>
            Compare the first impression, watch a scan, and edit the sample
            items. Selected files stay in your browser; every preview uses
            example items.
          </p>
        </div>
        <DesignButton
          variant="ghost"
          aria-pressed={!playing}
          onClick={() => setPlaying((value) => !value)}
        >
          {playing ? "Pause motion" : "Play motion"}
        </DesignButton>
      </div>
      <div className={styles.gallery}>
        {directions.map((direction) => (
          <ScanConcept
            key={direction.id}
            direction={direction}
            playing={playing}
          />
        ))}
      </div>
      <p className={styles.previewNote}>
        Design explorations · confirming a receipt here only updates the
        preview.
      </p>
    </fieldset>
  );
}
