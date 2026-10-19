import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry-config";

Sentry.init(sentryOptions());
