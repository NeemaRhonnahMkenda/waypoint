import type { Metadata } from "next";
import PrintView from "../components/PrintView";

export const metadata: Metadata = { title: "Printable itinerary" };

export default function Page() {
  return <PrintView />;
}
