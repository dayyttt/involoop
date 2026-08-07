import type { Metadata } from "next";
import LegalPage from "../legal-page";

export const metadata: Metadata = {
  title: "Terms of Service · Involoop",
  description: "How credits work, what test-mode payments mean, and what each side is responsible for.",
};

export default function Terms() {
  return <LegalPage doc="terms" />;
}
