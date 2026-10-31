"use client";

import NumberFlow from "@number-flow/react";
import { currencyFractionDigits } from "@/lib/money";
import { cn } from "@/lib/cn";
import { useDesignReducedMotion } from "@/components/design-system/use-design-reduced-motion";
import { balanceChangeTiming } from "@/components/design-system/motion-tokens";
import styles from "./animated-money.module.css";

export function AnimatedMoney({ amountMinor, currency = "USD", className }) {
  const reducedMotion = useDesignReducedMotion();
  const digits = currencyFractionDigits(currency);

  return (
    <NumberFlow
      value={amountMinor / 10 ** digits}
      locales="en-US"
      format={{
        style: "currency",
        currency,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }}
      transformTiming={balanceChangeTiming}
      spinTiming={balanceChangeTiming}
      opacityTiming={{ duration: 200, easing: "ease-out" }}
      animated={reducedMotion === false}
      className={cn(styles.number, className)}
    />
  );
}
