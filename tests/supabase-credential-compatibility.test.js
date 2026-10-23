// @vitest-environment node
import { createClient } from "@supabase/supabase-js";
import { expect, it, vi } from "vitest";

// SDK construction/transport rehearsal only: these keys and upload tokens are
// disposable, all HTTP is mocked, and no hosted permissions are established.
const url = "https://credential-rehearsal.invalid";
const options = { autoRefreshToken: false, persistSession: false };

it("passes a modern server key through the installed SDK for RPC and Storage signing", async () => {
  const key = "sb_secret_disposable_offline_rehearsal";
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })))
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          signedURL: "/object/sign/receipts/test?token=disposable",
        }),
      ),
    );
  const client = createClient(url, key, { auth: options, global: { fetch } });
  expect((await client.rpc("offline_probe")).error).toBeNull();
  expect(
    (await client.storage.from("receipts").createSignedUrl("test", 60)).error,
  ).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(2);
  for (const [, init] of fetch.mock.calls) {
    expect(new Headers(init.headers).get("apikey")).toBe(key);
  }
});

it("uses a modern public key for a signed browser upload without needing the server key", async () => {
  const key = "sb_publishable_disposable_offline_rehearsal";
  const fetch = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ Key: "upload-staging/test" })),
    );
  const client = createClient(url, key, { auth: options, global: { fetch } });
  const result = await client.storage
    .from("upload-staging")
    .uploadToSignedUrl(
      "test",
      "disposable-upload-token",
      new Blob(["offline image"]),
      { contentType: "image/png" },
    );
  expect(result.error).toBeNull();
  expect(fetch).toHaveBeenCalledOnce();
  expect(new Headers(fetch.mock.calls[0][1].headers).get("apikey")).toBe(key);
});
