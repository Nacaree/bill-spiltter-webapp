import { MobileBill } from "./mobile-bill";

export const metadata = {
  title: "Mobile layout · Version 2",
  description:
    "An interactive mobile Bill Splitter layout with Overview, Expenses, and Settle.",
  robots: { index: false, follow: false },
};

export default function ScreenTwoPage() {
  return <MobileBill />;
}
