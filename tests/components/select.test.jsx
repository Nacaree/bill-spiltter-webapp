import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { SelectControl } from "@/components/ui/select";
import { RetainedForm } from "@/components/retained-form";
afterEach(cleanup);
const options = [
  { value: "", label: "Everyone" },
  { value: "person-uuid", label: "Sokha" },
];
it("submits real participant values and restores the empty filter on reset", async () => {
  const { container } = render(
    <form>
      <SelectControl aria-label="Person" name="participant" options={options} />
    </form>,
  );
  const form = container.querySelector("form"),
    native = container.querySelector('select[name="participant"]');
  expect(new FormData(form).get("participant")).toBe("");
  fireEvent.change(native, { target: { value: "person-uuid" } });
  expect(screen.getByRole("combobox", { name: "Person" })).toHaveTextContent(
    "Sokha",
  );
  expect(new FormData(form).get("participant")).toBe("person-uuid");
  fireEvent.reset(form);
  await waitFor(() =>
    expect(screen.getByRole("combobox", { name: "Person" })).toHaveTextContent(
      "Everyone",
    ),
  );
  expect(new FormData(form).get("participant")).toBe("");
});
it("retains selected people after a rejected form reset and omits disabled controls", async () => {
  const contents = (
    <>
      <SelectControl aria-label="Person" name="participant" options={options} />
      <SelectControl
        aria-label="Disabled"
        name="disabled"
        disabled
        options={options}
      />
    </>
  );
  const { container, rerender } = render(
    <RetainedForm state={{}} onSubmit={(e) => e.preventDefault()}>
      {contents}
    </RetainedForm>,
  );
  const form = container.querySelector("form");
  fireEvent.change(container.querySelector('select[name="participant"]'), {
    target: { value: "person-uuid" },
  });
  fireEvent.submit(form);
  fireEvent.reset(form);
  rerender(
    <RetainedForm state={{ code: "rate_limited" }}>{contents}</RetainedForm>,
  );
  await waitFor(() =>
    expect(screen.getByRole("combobox", { name: "Person" })).toHaveTextContent(
      "Sokha",
    ),
  );
  expect(new FormData(form).get("participant")).toBe("person-uuid");
  expect(new FormData(form).has("disabled")).toBe(false);
});
it("focuses the visible trigger and explains a missing required selection", async () => {
  const { container } = render(
    <form>
      <SelectControl
        aria-label="Received by"
        name="recipient"
        required
        options={[
          { value: "", label: "Choose a person", disabled: true },
          options[1],
        ]}
      />
    </form>,
  );
  fireEvent.invalid(container.querySelector('select[name="recipient"]'));
  await waitFor(() =>
    expect(screen.getByRole("combobox", { name: "Received by" })).toHaveFocus(),
  );
  expect(screen.getByRole("combobox", { name: "Received by" })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(
    screen.getByRole("combobox", { name: "Received by" }),
  ).toHaveAccessibleDescription("Choose an option.");
  fireEvent.change(container.querySelector('select[name="recipient"]'), {
    target: { value: "person-uuid" },
  });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
