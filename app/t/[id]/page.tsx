import type { Metadata } from "next";
import OpenShared from "@/components/OpenShared";

export const metadata: Metadata = { title: "Shared trip", robots: { index: false, follow: false } };

export default function Page() {
  return <OpenShared />;
}
