"use client";

import { useDesignReducedMotion } from "./use-design-reduced-motion";

import { useEffect, useRef, useState } from "react";
import { MotionConfig } from "motion/react";
import { Check as AnimateCheck } from "./icons/animate-ui/check";
import { Copy as AnimateCopy } from "./icons/animate-ui/copy";
import { Upload as AnimateUpload } from "./icons/animate-ui/upload";
import { CheckIcon as LucideCheck } from "./icons/lucide-animated/check";
import { CopyIcon as LucideCopy } from "./icons/lucide-animated/copy";
import { UploadIcon as LucideUpload } from "./icons/lucide-animated/upload";
import { DesignButton, DesignCheckbox, DesignSurface } from "./primitives";
import styles from "./icon-comparison.module.css";

const libraries = [
  {
    id: "animate-ui",
    name: "Animate UI",
    url: "https://animate-ui.com/docs/icons/get-started",
    license: "MIT + Commons Clause",
  },
  {
    id: "lucide-animated",
    name: "Lucide Animated",
    url: "https://lucide-animated.com/",
    license: "MIT",
  },
];
const animateIcons = {
  check: AnimateCheck,
  copy: AnimateCopy,
  upload: AnimateUpload,
};
const lucideIcons = {
  check: LucideCheck,
  copy: LucideCopy,
  upload: LucideUpload,
};
const iconLabels = { upload: "Upload", copy: "Copy", check: "Check" };

function LibraryIcon({ library, name, active, size = 24 }) {
  const controls = useRef(null);
  const reducedMotion = useDesignReducedMotion();
  const enabled = active && reducedMotion === false;
  const AnimateIcon = animateIcons[name];
  const LucideIcon = lucideIcons[name];

  useEffect(() => {
    if (library !== "lucide-animated") return;
    if (enabled) controls.current?.startAnimation();
    else controls.current?.stopAnimation();
  }, [enabled, library]);

  return (
    <span className={styles.icon} aria-hidden="true">
      {library === "animate-ui" ? (
        <AnimateIcon size={size} animate={enabled} />
      ) : (
        <LucideIcon ref={controls} size={size} />
      )}
    </span>
  );
}

function IconExample({ library, name, playing, cycle, onPlay }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [replay, setReplay] = useState(0);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      className={styles.iconExample}
      aria-label={`Replay ${iconLabels[name].toLowerCase()} icon`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onClick={() => {
        clearTimeout(timer.current);
        setReplay((current) => current + 1);
        setPressed(true);
        timer.current = setTimeout(() => setPressed(false), 1000);
        onPlay(`${iconLabels[name]} preview replayed.`);
      }}
    >
      <span className={styles.iconTile}>
        <LibraryIcon
          key={`${cycle}:${replay}`}
          library={library}
          name={name}
          active={playing || hovered || focused || pressed}
        />
      </span>
      <span>{iconLabels[name]}</span>
    </button>
  );
}

function LibraryPanel({ library, playing, cycle }) {
  const [people, setPeople] = useState(["You", "Sokha"]);
  const [notice, setNotice] = useState("");

  return (
    <DesignSurface
      role="group"
      aria-labelledby={`${library.id}-heading`}
      className={styles.panel}
    >
      <div className={styles.panelHeading}>
        <span className={styles.libraryMark} aria-hidden="true">
          {library.id === "animate-ui" ? "a" : "l"}
        </span>
        <div>
          <h3 id={`${library.id}-heading`}>{library.name}</h3>
          <p>Original icon animations</p>
        </div>
      </div>
      <div className={styles.examples}>
        {["upload", "copy", "check"].map((name) => (
          <IconExample
            key={name}
            library={library.id}
            name={name}
            playing={playing}
            cycle={cycle}
            onPlay={setNotice}
          />
        ))}
      </div>
      <fieldset
        className={styles.split}
        aria-label={`${library.name} split with`}
      >
        <legend>Try a round split selector</legend>
        <div className={styles.choices}>
          {["You", "Sokha", "Mali"].map((person) => (
            <DesignCheckbox
              key={person}
              checked={people.includes(person)}
              onChange={(event) => {
                const checked = event.target.checked;
                setPeople((current) =>
                  checked
                    ? [...current, person]
                    : current.filter((name) => name !== person),
                );
                setNotice(
                  `${person} ${checked ? "included in" : "removed from"} this sample split.`,
                );
              }}
              indicator={
                <LibraryIcon
                  key={cycle}
                  library={library.id}
                  name="check"
                  size={14}
                  active={people.includes(person)}
                />
              }
            >
              {person}
            </DesignCheckbox>
          ))}
        </div>
      </fieldset>
      <p role="status" className={styles.status}>
        {notice}
      </p>
      <div className={styles.panelFooter}>
        <span>{library.license}</span>
        <a href={library.url} target="_blank" rel="noreferrer">
          Browse library <span aria-hidden="true">↗</span>
        </a>
      </div>
    </DesignSurface>
  );
}

export function IconComparison() {
  const [playing, setPlaying] = useState(false);
  const [cycle, setCycle] = useState(0);
  const timer = useRef(null);
  const reducedMotion = useDesignReducedMotion();
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <MotionConfig reducedMotion="user">
      <div className={styles.toolbar}>
        <p>
          {reducedMotion
            ? "Reduced motion is on. Icons stay still; selections still work."
            : "Hover, focus, or tap. Play both to compare their default motion."}
        </p>
        <DesignButton
          variant="secondary"
          disabled={playing || Boolean(reducedMotion)}
          onClick={() => {
            setCycle((current) => current + 1);
            setPlaying(true);
            timer.current = setTimeout(() => setPlaying(false), 1000);
          }}
        >
          <span aria-hidden="true">↻</span>
          {playing ? "Playing…" : "Play both"}
        </DesignButton>
      </div>
      <div className={styles.comparison}>
        {libraries.map((library) => (
          <LibraryPanel
            key={library.id}
            library={library}
            playing={playing}
            cycle={cycle}
          />
        ))}
      </div>
      <p className={styles.footnote}>
        Same size, color, and controls. Each library keeps its own timing and
        motion. These examples don’t upload files or copy a bill link.
      </p>
    </MotionConfig>
  );
}
