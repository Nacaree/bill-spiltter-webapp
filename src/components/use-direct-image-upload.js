"use client";

import { useRef, useState } from "react";
import { directImageUpload } from "@/lib/direct-image-upload";

export function useDirectImageUpload({ shareToken, purpose }) {
  const file = useRef(null);
  const reservation = useRef(null);
  const running = useRef(false);
  const [stage, setStage] = useState("idle");
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const pending = ["preparing", "uploading", "processing"].includes(stage);
  function selectFile(event) {
    file.current = event.target.files?.[0] ?? null;
    reservation.current = null;
    setError(null);
    setResult(null);
  }
  async function submit(event) {
    event.preventDefault();
    if (running.current) return null;
    running.current = true;
    setError(null);
    setResult(null);
    try {
      const completed = await directImageUpload({
        file: file.current,
        shareToken,
        purpose,
        reservation: reservation.current,
        onReservation: (value) => {
          reservation.current = value;
        },
        onStage: setStage,
      });
      setResult(completed);
      setStage("complete");
      return completed;
    } catch (failure) {
      if (failure.resetUpload) reservation.current = null;
      setError(failure.message || "We couldn’t upload this image. Try again.");
      setStage("failed");
      return null;
    } finally {
      running.current = false;
    }
  }
  return { selectFile, submit, stage, pending, error, result };
}
