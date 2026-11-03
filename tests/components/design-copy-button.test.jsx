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

it("keeps a pending copy and its confirmation when switching to an accessible icon button", async () => {
  vi.useFakeTimers();
  let finishCopy;
  const onCopy = vi.fn(
    () =>
      new Promise((resolve) => {
        finishCopy = resolve;
      }),
  );
  const control = (iconOnly) => (
    <DesignCopyButton
      onCopy={onCopy}
      iconOnly={iconOnly}
      aria-label={
        iconOnly ? "Copy invitation link" : "Copy link to invite people"
      }
    >
      Copy link
    </DesignCopyButton>
  );
  const { rerender } = render(control(false));
  const button = screen.getByRole("button", {
    name: "Copy link to invite people",
  });
  fireEvent.click(button);
  rerender(control(true));
  expect(screen.getByRole("button", { name: "Copy invitation link" })).toBe(
    button,
  );
  expect(button).toHaveAttribute("type", "button");
  expect(button).toHaveAttribute("aria-busy", "true");
  expect(button).toHaveAttribute("data-icon-only", "true");
  expect(button).toHaveAttribute("title", "Copy invitation link");
  button.focus();
  await act(async () => finishCopy(true));
  expect(button).toHaveFocus();
  expect(button).toHaveAttribute("data-copy-state", "copied");
  expect(button).toHaveAttribute("title", "Copied");
  expect(button.querySelector('[aria-live="polite"]')).toHaveTextContent(
    "Copied",
  );
  act(() => vi.advanceTimersByTime(900));
  rerender(control(false));
  expect(button).toHaveAttribute("data-copy-state", "copied");
  expect(screen.getByRole("button", { name: "Copied" })).toBe(button);
  act(() => vi.advanceTimersByTime(900));
  expect(button).toHaveAttribute("data-copy-state", "idle");
  expect(
    screen.getByRole("button", { name: "Copy link to invite people" }),
  ).toBe(button);
  expect(onCopy).toHaveBeenCalledTimes(1);
});

it.each([false, "reject"])(
  "retains the compact copy action after failure: %s",
  async (result) => {
    const onCopy =
      result === "reject"
        ? vi.fn().mockRejectedValue(new Error("Clipboard denied"))
        : vi.fn().mockResolvedValue(false);
    render(
      <DesignCopyButton
        onCopy={onCopy}
        iconOnly
        aria-label="Copy invitation link"
        title="Copy this invitation"
      >
        Copy link
      </DesignCopyButton>,
    );
    const button = screen.getByRole("button", { name: "Copy invitation link" });
    await act(async () => fireEvent.click(button));
    expect(button).toHaveAttribute("data-copy-state", "idle");
    expect(button).toHaveAttribute("title", "Copy this invitation");
    expect(button).toBeEnabled();
  },
);
