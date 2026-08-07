import type { Metadata } from "next";
import LegalPage from "../legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy · Involoop",
  description: "What Involoop stores, who processes it, and how to have it deleted.",
};

export default function Privacy() {
  return <LegalPage doc="privacy" />;
}
