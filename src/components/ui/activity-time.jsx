"use client";

import { Popover } from "radix-ui";
import { formatActivityTime } from "@/lib/activity-time";
import { useVisibleClock } from "@/lib/visible-clock";
import { cn } from "@/lib/cn";
import styles from "./activity-time.module.css";

export function ActivityTime({ createdAt, className }) {
  const now = useVisibleClock();
  const value = formatActivityTime(createdAt, now);

  if (!value)
    return (
      <span
        className={cn(styles.placeholder, className)}
        aria-label="Activity time unavailable"
      >
        —
      </span>
    );

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(styles.trigger, className)}
          aria-label={`${value.label}, show exact date and time`}
        >
          <time dateTime={value.dateTime}>{value.label}</time>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={styles.details}
          aria-label="Exact activity time"
          side="top"
          align="end"
          sideOffset={8}
          collisionPadding={16}
        >
          <time dateTime={value.dateTime}>{value.exact}</time>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
