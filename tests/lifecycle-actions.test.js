// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  guard: vi.fn(),
  remove: vi.fn(),
  files: vi.fn(),
  set: vi.fn(),
  after: vi.fn(),
  redirect: vi.fn(),
  revalidate: vi.fn(),
  report: vi.fn(),
}));
vi.mock("@/server/monitoring", () => ({
  monitorAction: (_name, work) => work(),
  reportAppError: mocks.report,
}));
vi.mock("@/server/rate-limits", () => ({ guardRequest: mocks.guard }));
vi.mock("@/server/bill-lifecycle", () => ({
  deleteBillPermanently: mocks.remove,
  removeDeletedBillFiles: mocks.files,
}));
vi.mock("@/server/bills", () => ({
  BillNotFoundError: class extends Error {},
  ParticipantSessionRequiredError: class extends Error {},
}));
vi.mock("@/server/payment-methods", () => ({
  CreatorAccessRequiredError: class extends Error {},
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name) => ({
      value: name === "bill_creator" ? "private-recovery" : "private-session",
    }),
    set: mocks.set,
  }),
}));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { deleteBillAction } from "@/app/lifecycle-actions";
import { CreatorAccessRequiredError } from "@/server/payment-methods";
const share = "a".repeat(43);
function form(value = "DELETE") {
  const f = new FormData();
  f.set("shareToken", share);
  f.set("confirmation", value);
  return f;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.remove.mockResolvedValue("bill-id");
  mocks.redirect.mockImplementation(() => {
    throw new Error("redirected");
  });
});
it("requires exact confirmation before attempting deletion", async () => {
  expect(await deleteBillAction({}, form("delete"))).toMatchObject({
    errors: { confirmation: expect.any(String) },
  });
  expect(mocks.guard).toHaveBeenCalledOnce();
  expect(mocks.remove).not.toHaveBeenCalled();
  expect(mocks.set).not.toHaveBeenCalled();
});
it("uses server-held credentials, clears only bill-scoped cookies and redirects after accepted deletion", async () => {
  await expect(deleteBillAction({}, form())).rejects.toThrow("redirected");
  expect(mocks.remove).toHaveBeenCalledWith({
    shareToken: share,
    cookieValue: "private-session",
    recoveryToken: "private-recovery",
  });
  expect(mocks.set).toHaveBeenCalledTimes(2);
  for (const call of mocks.set.mock.calls)
    expect(call[2]).toMatchObject({
      path: `/b/${share}`,
      maxAge: 0,
      httpOnly: true,
    });
  expect(mocks.after).toHaveBeenCalledOnce();
  expect(mocks.files).not.toHaveBeenCalled();
  await mocks.after.mock.calls[0][0]();
  expect(mocks.files).toHaveBeenCalledWith("bill-id");
  expect(mocks.redirect).toHaveBeenCalledWith("/bill-deleted");
});
it("rejected creator credentials leave cookies and file storage unchanged", async () => {
  mocks.remove.mockRejectedValue(new CreatorAccessRequiredError());
  expect(await deleteBillAction({}, form())).toMatchObject({
    errors: { form: expect.stringContaining("device") },
  });
  expect(mocks.set).not.toHaveBeenCalled();
  expect(mocks.after).not.toHaveBeenCalled();
  expect(mocks.redirect).not.toHaveBeenCalled();
});
