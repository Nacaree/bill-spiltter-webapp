import { DesignField } from "@/components/design-system/primitives";

export function Field({ className, ...props }) {
  return <DesignField inputClassName={className} {...props} />;
}
