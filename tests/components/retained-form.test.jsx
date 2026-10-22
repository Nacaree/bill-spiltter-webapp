import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { RetainedForm } from "@/components/retained-form";
afterEach(cleanup);
it("restores text, selects and checkboxes after React resets a blocked form", async () => {
  const contents = (
    <>
      <input aria-label="Description" name="description" defaultValue="" />
      <select aria-label="Currency" name="currency" defaultValue="USD">
        <option>USD</option>
        <option>KHR</option>
      </select>
      <input aria-label="Person" name="person" type="checkbox" value="owner" />
      <button type="submit">Save</button>
    </>
  );
  const { rerender, container } = render(
    <RetainedForm state={{}} onSubmit={(e) => e.preventDefault()}>
      {contents}
    </RetainedForm>,
  );
  fireEvent.change(screen.getByLabelText("Description"), {
    target: { value: "Dinner" },
  });
  fireEvent.change(screen.getByLabelText("Currency"), {
    target: { value: "KHR" },
  });
  fireEvent.click(screen.getByLabelText("Person"));
  fireEvent.submit(container.querySelector("form"));
  container.querySelector("form").reset();
  rerender(
    <RetainedForm
      state={{ code: "rate_limited" }}
      onSubmit={(e) => e.preventDefault()}
    >
      {contents}
    </RetainedForm>,
  );
  await waitFor(() =>
    expect(screen.getByLabelText("Description")).toHaveValue("Dinner"),
  );
  expect(screen.getByLabelText("Currency")).toHaveValue("KHR");
  expect(screen.getByLabelText("Person")).toBeChecked();
});
it("keeps normal successful reset behavior", () => {
  const { container } = render(
    <RetainedForm state={{ success: true }}>
      <input aria-label="Name" name="name" defaultValue="" />
    </RetainedForm>,
  );
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Owner" },
  });
  container.querySelector("form").reset();
  expect(screen.getByLabelText("Name")).toHaveValue("");
});

it("retains rejected entries and focuses the invalid field after server validation", async () => {
  function contents(error) {
    return (
      <>
        <label htmlFor="amount">Amount</label>
        <input
          id="amount"
          name="amount"
          defaultValue=""
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "amount-error" : undefined}
        />
        {error ? <p id="amount-error">Enter a valid amount.</p> : null}
        <button type="submit">Save</button>
      </>
    );
  }
  const { container, rerender } = render(
    <RetainedForm state={{}} onSubmit={(e) => e.preventDefault()}>
      {contents(false)}
    </RetainedForm>,
  );
  fireEvent.change(screen.getByLabelText("Amount"), {
    target: { value: "bad amount" },
  });
  fireEvent.submit(container.querySelector("form"));
  container.querySelector("form").reset();
  rerender(
    <RetainedForm state={{ errors: { amount: "Enter a valid amount." } }}>
      {contents(true)}
    </RetainedForm>,
  );
  await waitFor(() => expect(screen.getByLabelText("Amount")).toHaveFocus());
  expect(screen.getByLabelText("Amount")).toHaveValue("bad amount");
  expect(screen.getByLabelText("Amount")).toHaveAccessibleDescription(
    "Enter a valid amount.",
  );
});

it("focuses a general action error only after submission", async () => {
  const contents = (
    <>
      <input aria-label="Name" name="name" />
      <p role="alert">Please try later.</p>
    </>
  );
  const { container, rerender } = render(
    <RetainedForm
      state={{ errors: { form: "Please try later." } }}
      onSubmit={(e) => e.preventDefault()}
    >
      {contents}
    </RetainedForm>,
  );
  expect(screen.getByRole("alert")).not.toHaveFocus();
  fireEvent.submit(container.querySelector("form"));
  rerender(
    <RetainedForm state={{ errors: { form: "Please try later." } }}>
      {contents}
    </RetainedForm>,
  );
  await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus());
});
