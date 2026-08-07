import type { Metadata } from "next";
import AdminConsole from "./admin-client";

// The middleware has already refused anyone who is not an admin, and the API
// routes and the database each refuse independently. This page assumes nothing
// from that: it renders a shell and every number in it arrives from an endpoint
// that checks again.
export const metadata: Metadata = {
  title: "Operator console · Involoop",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return <AdminConsole />;
}
