import { randomBytes, createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

test("a >4.5 MB receipt goes directly to storage and creates only one scan", async ({
  page,
}) => {
  test.skip(
    process.env.RUN_SUPABASE_E2E !== "1",
    "Apply migrations and run npm run test:e2e:uploads.",
  );
  test.setTimeout(150_000);
  const image = await sharp(randomBytes(1500 * 1500 * 3), {
    raw: { width: 1500, height: 1500, channels: 3 },
  })
    .png()
    .toBuffer();
  expect(image.length).toBeGreaterThan(4.5 * 1024 * 1024);
  const actionSizes = [];
  const storageSizes = [];
  page.on("request", (request) => {
    if (request.headers()["next-action"])
      actionSizes.push(request.postDataBuffer()?.length ?? 0);
    if (
      new URL(request.url()).pathname.includes(
        "/storage/v1/object/upload/sign/image-upload-staging/",
      )
    )
      storageSizes.push(request.postDataBuffer()?.length ?? 0);
  });
  const name = `Direct upload browser ${Date.now()}`;
  let token;
  try {
    await page.goto("/");
    await page.getByLabel("Bill name").fill(name);
    await page.getByLabel("Your name", { exact: true }).fill("Upload tester");
    await page
      .getByRole("button", { name: "Create bill", exact: true })
      .click();
    await expect(page).toHaveURL(/\/b\/[A-Za-z0-9_-]{43}$/);
    token = new URL(page.url()).pathname.split("/").at(-1);
    await page.getByLabel("Receipt image", { exact: true }).setInputFiles({
      name: "large-test-receipt.png",
      mimeType: "image/png",
      buffer: image,
    });
    await page
      .getByRole("button", { name: "Upload receipt", exact: true })
      .click();
    await expect(page).toHaveURL(/\/receipts\/[a-f0-9-]+$/);
    expect(storageSizes.some((size) => size >= image.length)).toBe(true);
    expect(actionSizes.every((size) => size < 4 * 1024 * 1024)).toBe(true);
    await expect(
      page.getByRole("heading", { name: "Review receipt", exact: true }),
    ).toBeVisible();
  } finally {
    if (token && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } },
      );
      const { data: bill } = await db
        .from("bills")
        .select("id")
        .eq("public_id_hash", createHash("sha256").update(token).digest("hex"))
        .eq("name", name)
        .maybeSingle();
      if (bill) {
        const { count } = await db
          .from("receipt_scans")
          .select("id", { count: "exact", head: true })
          .eq("bill_id", bill.id);
        try {
          expect(count).toBe(1);
          // Allow the generated-fixture extraction to finish before deleting its bill.
          await expect
            .poll(
              async () => {
                const { data } = await db
                  .from("receipt_scans")
                  .select("status")
                  .eq("bill_id", bill.id)
                  .single();
                return data?.status;
              },
              { timeout: 100_000 },
            )
            .not.toMatch(/^(uploaded|processing)$/);
        } finally {
          for (const bucket of ["image-upload-staging", "receipt-images"]) {
            const { data } = await db.storage.from(bucket).list(bill.id);
            if (data?.length)
              await db.storage
                .from(bucket)
                .remove(data.map((item) => `${bill.id}/${item.name}`));
          }
          const { error } = await db.from("bills").delete().eq("id", bill.id);
          if (error) throw error;
        }
      }
    }
  }
});
