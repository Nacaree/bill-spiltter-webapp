import { createClient } from "@supabase/supabase-js";
import {
  prepareImageUploadAction,
  completeImageUploadAction,
} from "@/app/image-upload-actions";
import { ImageUploadError, parseImageUploadMetadata } from "@/lib/image-upload";

let browserClient;
function storageClient() {
  browserClient ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
  return browserClient;
}

// The only binary request goes from this browser directly to Supabase Storage.
export async function directImageUpload(
  { file, shareToken, purpose, reservation, onReservation, onStage },
  {
    prepare = prepareImageUploadAction,
    complete = completeImageUploadAction,
    storage = storageClient,
  } = {},
) {
  if (!file) throw new ImageUploadError("Choose an image first.");
  const metadata = parseImageUploadMetadata({
    shareToken,
    purpose,
    filename: file.name,
    size: file.size,
    mimeType: file.type,
  });
  let ticket = reservation;
  if (!ticket || new Date(ticket.expiresAt).getTime() <= Date.now()) {
    onStage("preparing");
    const prepared = await prepare(metadata);
    if (prepared.error) throw new ImageUploadError(prepared.error, prepared);
    ticket = { ...prepared.upload, uploaded: false };
    onReservation(ticket);
  }
  if (!ticket.uploaded) {
    onStage("uploading");
    const { error } = await storage()
      .storage.from(ticket.bucket)
      .uploadToSignedUrl(ticket.path, ticket.token, file, {
        contentType: ticket.mimeType,
      });
    if (error && String(error.statusCode) !== "409")
      throw new ImageUploadError(
        "The image couldn’t finish uploading. Check your connection and retry.",
      );
    ticket = { ...ticket, uploaded: true };
    onReservation(ticket);
  }
  onStage("processing");
  const completed = await complete(ticket.uploadId);
  if (completed.error) throw new ImageUploadError(completed.error, completed);
  return completed.result;
}
