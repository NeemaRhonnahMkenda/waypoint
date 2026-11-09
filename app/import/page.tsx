import type { Metadata } from "next";
import ImportLink from "@/components/ImportLink";

export const metadata: Metadata = { title: "Open trip", robots: { index: false, follow: false } };

export default function Page() {
  return <ImportLink />;
}
