import { withSentryConfig } from "@sentry/nextjs/config";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

if (existsSync(".env.sentry-build-plugin"))
  loadEnvFile(".env.sentry-build-plugin");

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_SENTRY_ENVIRONMENT:
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
      process.env.VERCEL_ENV ||
      process.env.NODE_ENV ||
      "development",
    NEXT_PUBLIC_SENTRY_RELEASE:
      process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || "",
  },
};

if (process.env.VERCEL && !process.env.SENTRY_AUTH_TOKEN) {
  throw new Error(
    "Set SENTRY_AUTH_TOKEN in Vercel before building so Sentry can upload private source maps.",
  );
}

export default withSentryConfig(nextConfig, {
  org: "nathan-d2",
  project: "bill-splitter-webapp",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
  widenClientFileUpload: true,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
    deleteSourcemapsAfterUpload: true,
  },
  release: {
    name: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
  },
});
