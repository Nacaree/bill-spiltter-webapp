import { monitorAction } from "@/server/monitoring";
import { guardRequest } from "@/server/rate-limits";
import { rateLimitFailure } from "@/lib/rate-limit-error";

export function protectedAction(name, work) {
  return monitorAction(name, async () => {
    try {
      await guardRequest();
      return await work();
    } catch (error) {
      const failure = rateLimitFailure(
        error,
        ["prepareImageUploadAction", "completeImageUploadAction"].includes(
          name,
        ),
      );
      if (failure) return failure;
      throw error;
    }
  });
}
