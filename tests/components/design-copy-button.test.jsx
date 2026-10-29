import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DesignCopyButton } from "@/components/design-system/copy-button";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("confirms only after copying succeeds, keeps focus, and restores its label", async () => {
  vi.useFakeTimers();
  let finishCopy;
  const onCopy = vi.fn(
    () =>
      new Promise((resolve) => {
        finishCopy = resolve;
      }),
  );
  render(<DesignCopyButton onCopy={onCopy}>Copy theme</DesignCopyButton>);
  const button = screen.getByRole("button", { name: "Copy theme" });
  button.focus();
  fireEvent.click(button);
  fireEvent.click(button);
  expect(onCopy).toHaveBeenCalledTimes(1);
  expect(button).toHaveAttribute("aria-busy", "true");
  expect(button).not.toHaveTextContent(/^Copied$/);

  await act(async () => finishCopy(true));
  expect(screen.getByRole("button", { name: "Copied" })).toBe(button);
  expect(button).toHaveFocus();
  expect(button).toHaveAttribute("data-copy-state", "copied");

  act(() => vi.advanceTimersByTime(1800));
  expect(screen.getByRole("button", { name: "Copy theme" })).toBe(button);
});

it.each([false, "reject"])(
  "does not show a successful copy for failure: %s",
  async (result) => {
    const onCopy =
      result === "reject"
        ? vi.fn().mockRejectedValue(new Error("Clipboard denied"))
        : vi.fn().mockResolvedValue(false);
    render(<DesignCopyButton onCopy={onCopy}>Copy link</DesignCopyButton>);
    const button = screen.getByRole("button", { name: "Copy link" });
    await act(async () => fireEvent.click(button));
    expect(button).toHaveAttribute("data-copy-state", "idle");
    expect(screen.getByRole("button", { name: "Copy link" })).toBeEnabled();
  },
);
