"use client";

import { useState } from "react";
import { SelectControl } from "@/components/ui/select";
import { DesignSurface } from "./primitives";
import system from "./system.module.css";
import styles from "./person-picker.module.css";

const samplePeople = [
  { id: "you", name: "You", initials: "JD", tone: "purple" },
  { id: "sokha", name: "Sokha", initials: "SK", tone: "peach" },
  { id: "mali", name: "Mali", initials: "ML", tone: "green" },
];

function Check() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path pathLength="1" d="m5 12 4 4L19 6" />
    </svg>
  );
}

function Chevron({ up = false }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={up ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} />
    </svg>
  );
}

function Avatar({ person }) {
  return (
    <span
      className={`${styles.avatar} ${styles[person.tone ?? "purple"]}`}
      aria-hidden="true"
    >
      {person.initials ?? person.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function TriggerContents({ person }) {
  return (
    <>
      <Avatar person={person} />
      <span className={styles.personName}>{person.name}</span>
      <span className={styles.chevron}>
        <Chevron />
      </span>
    </>
  );
}

export function PersonPicker({
  id,
  label,
  people = samplePeople,
  defaultValue = "you",
  ...props
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <SelectControl
        id={id}
        aria-label={label}
        person
        defaultValue={defaultValue}
        options={people.map((person) => ({
          value: person.id,
          label: person.name ?? person.display_name,
          initials: person.initials,
          tone: person.tone,
        }))}
        {...props}
      />
    </div>
  );
}

function StaticRow({ person, selected = false, highlighted = false }) {
  return (
    <li
      className={`${styles.option} ${selected ? styles.selected : ""} ${highlighted ? styles.highlighted : ""}`}
    >
      <Avatar person={person} />
      <span className={styles.personName}>{person.name}</span>
      {selected && (
        <span className={styles.indicator}>
          <Check />
        </span>
      )}
    </li>
  );
}

export function PersonPickerShowcase({ themeStyle }) {
  const [personId, setPersonId] = useState("you");
  const person = samplePeople.find((item) => item.id === personId);
  return (
    <DesignSurface id="person-picker" className={styles.showcase}>
      <div className={styles.showcaseHeading}>
        <div>
          <p className={styles.eyebrow}>PERSON PICKER</p>
          <h3>A familiar choice, made clearer.</h3>
          <p>Avatars, a little glass, and a clear selected state.</p>
        </div>
        <span className={styles.previewTag}>Interactive preview</span>
      </div>
      <div className={styles.liveExample}>
        <PersonPicker
          id="studio-picker-playground"
          label="Try the person picker"
          value={personId}
          onValueChange={setPersonId}
          themeStyle={themeStyle}
        />
        <p role="status" className={styles.liveStatus}>
          {person.name} is selected. Sample data only.
        </p>
      </div>
      <div className={styles.states}>
        <div className={styles.stateCard}>
          <h4>
            <span>01</span> Closed
          </h4>
          <div className={styles.stateStage}>
            <div className={styles.staticLabel}>Paid by</div>
            <div className={styles.trigger}>
              <span className={styles.triggerContents}>
                <TriggerContents person={samplePeople[0]} />
              </span>
            </div>
          </div>
          <p>Initials, selected name, and a chevron.</p>
        </div>
        <div className={styles.stateCard}>
          <h4>
            <span>02</span> Open
          </h4>
          <div className={styles.stateStage}>
            <ul
              className={`${system.glass} ${styles.staticMenu}`}
              aria-label="Open picker appearance"
            >
              <StaticRow person={samplePeople[0]} selected />
              <StaticRow person={samplePeople[1]} highlighted />
              <StaticRow person={samplePeople[2]} />
            </ul>
          </div>
          <p>A frosted panel with distinct person rows.</p>
        </div>
        <div className={styles.stateCard}>
          <h4>
            <span>03</span> Selected
          </h4>
          <div className={styles.stateStage}>
            <ul
              className={styles.selectedExample}
              aria-label="Selected person appearance"
            >
              <StaticRow person={samplePeople[1]} selected />
            </ul>
          </div>
          <p>A purple check marks the current choice.</p>
        </div>
      </div>
      <div
        className={styles.keyboardGuide}
        aria-label="Person picker keyboard controls"
      >
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd> Navigate
        </span>
        <span>
          <kbd>Enter</kbd> Select
        </span>
        <span>
          <kbd>Esc</kbd> Close
        </span>
      </div>
    </DesignSurface>
  );
}
