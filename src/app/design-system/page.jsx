import { notFound } from "next/navigation";
import { DesignReference } from "@/components/design-system/design-reference";

export const metadata = {
  title: "Design studio",
  robots: { index: false, follow: false },
};

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DesignReference />;
}
