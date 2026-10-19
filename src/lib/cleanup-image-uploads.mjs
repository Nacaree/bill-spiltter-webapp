// Shared by request-time maintenance and the private operator command.
export async function cleanupImageUploadBatch(
  db,
  now = Date.now(),
  bucket = "image-upload-staging",
) {
  const { data, error } = await db
    .from("image_upload_reservations")
    .select("id, storage_key, purpose, status")
    .lt("created_at", new Date(now - 24 * 60 * 60_000).toISOString())
    .order("created_at")
    .limit(20);
  if (error) throw error;
  if (!data.length) return 0;
  const { error: stagingError } = await db.storage
    .from(bucket)
    .remove(data.map((r) => r.storage_key));
  if (stagingError) throw stagingError;
  const orphanReceipts = data.filter(
    (r) => r.purpose === "receipt" && r.status !== "complete",
  );
  if (orphanReceipts.length) {
    const { error: finalError } = await db.storage
      .from("receipt-images")
      .remove(orphanReceipts.map((r) => r.storage_key));
    if (finalError) throw finalError;
  }
  const { error: deleteError } = await db
    .from("image_upload_reservations")
    .delete()
    .in(
      "id",
      data.map((r) => r.id),
    );
  if (deleteError) throw deleteError;
  return data.length;
}
