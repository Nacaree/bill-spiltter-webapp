"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ReceiptStatusRefresh() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 2_000);
    return () => window.clearInterval(timer);
  }, [router]);

  return null;
}
