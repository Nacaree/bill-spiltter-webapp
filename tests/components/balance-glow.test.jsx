import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DesignBalanceGlow } from "@/components/design-system/balance-glow";
import { balanceChangeTiming } from "@/components/design-system/motion-tokens";

const preference = vi.hoisted(() => ({ reduced: false }));
vi.mock("@/components/design-system/use-design-reduced-motion", () => ({
  useDesignReducedMotion: () => preference.reduced,
}));

let animate;
let animations;
const originalAnimate = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "animate",
);

beforeEach(() => {
  preference.reduced = false;
  animations = [];
  animate = vi.fn(() => {
    const animation = { cancel: vi.fn() };
    animations.push(animation);
    return animation;
  });
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: animate,
  });
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete document.hidden;
  if (originalAnimate)
    Object.defineProperty(HTMLElement.prototype, "animate", originalAnimate);
  else delete HTMLElement.prototype.animate;
});

it("does not pulse on mount, hydration readiness, or unchanged balances", () => {
  preference.reduced = null;
  const { rerender } = render(<DesignBalanceGlow active balanceMinor={5300} />);
  preference.reduced = false;
  rerender(<DesignBalanceGlow active balanceMinor={5300} />);
  expect(animate).not.toHaveBeenCalled();
});

it("reacts to a real balance change with the shared digit-roll timing", () => {
  const { container, rerender } = render(
    <DesignBalanceGlow active balanceMinor={5300} />,
  );
  rerender(<DesignBalanceGlow active balanceMinor={6500} />);
  expect(animate).toHaveBeenCalledOnce();
  expect(animate.mock.calls[0][1]).toEqual(balanceChangeTiming);
  expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  expect(container.querySelector("[aria-live]")).toBeNull();
});

it("merges interrupted changes from the current brightness and cleans up on unmount", () => {
  const { rerender, unmount } = render(
    <DesignBalanceGlow active balanceMinor={5300} />,
  );
  rerender(<DesignBalanceGlow active balanceMinor={6500} />);
  vi.spyOn(window, "getComputedStyle").mockReturnValue({
    filter: "brightness(1.09)",
  });
  rerender(<DesignBalanceGlow active balanceMinor={4100} />);
  expect(animations[0].cancel).toHaveBeenCalledOnce();
  expect(animate.mock.calls[1][0][0].filter).toBe("brightness(1.09)");
  unmount();
  expect(animations[1].cancel).toHaveBeenCalledOnce();
});

it("cancels offscreen or paused reactions without replaying unseen changes", () => {
  const { rerender } = render(<DesignBalanceGlow active balanceMinor={5300} />);
  rerender(<DesignBalanceGlow active balanceMinor={6500} />);
  rerender(<DesignBalanceGlow active={false} balanceMinor={6500} />);
  expect(animations[0].cancel).toHaveBeenCalledOnce();
  rerender(<DesignBalanceGlow active={false} balanceMinor={4100} />);
  rerender(<DesignBalanceGlow active balanceMinor={4100} />);
  expect(animate).toHaveBeenCalledOnce();
});

it("cancels for reduced motion and does not queue changes for reactivation", () => {
  const { rerender } = render(<DesignBalanceGlow active balanceMinor={5300} />);
  rerender(<DesignBalanceGlow active balanceMinor={6500} />);
  preference.reduced = true;
  rerender(<DesignBalanceGlow active balanceMinor={6500} />);
  expect(animations[0].cancel).toHaveBeenCalledOnce();
  rerender(<DesignBalanceGlow active balanceMinor={4100} />);
  preference.reduced = false;
  rerender(<DesignBalanceGlow active balanceMinor={4100} />);
  expect(animate).toHaveBeenCalledOnce();
});

it("does not pulse for balance changes in a hidden tab", () => {
  const { rerender } = render(<DesignBalanceGlow active balanceMinor={5300} />);
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: true,
  });
  rerender(<DesignBalanceGlow active balanceMinor={6500} />);
  expect(animate).not.toHaveBeenCalled();
});
