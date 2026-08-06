import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

function env(path) {
  const out = {};
  for (const line of fs.readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const e = env(".env.local");
const admin = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const PASSWORD = "involoop-demo-2026";

async function deleteAllTestUsers() {
  let next = null;
  do {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    const toDelete = data.users.filter((u) => u.email && u.email.endsWith("@involoop.app"));
    for (const u of toDelete) {
      await admin.auth.admin.deleteUser(u.id);
    }
    next = null;
  } while (next);
  console.log(`deleted test users`);
}

async function signupUser(email, fullName, ref = null) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error || !data.user) throw error;
  const { data: res, error: rpcErr } = await admin.rpc("finalize_signup", {
    p_user_id: data.user.id,
    p_email: email,
    p_full_name: fullName,
    p_ref_invoice_public_id: ref,
  });
  if (rpcErr) throw rpcErr;
  return { id: data.user.id, ...res };
}

async function main() {
  await deleteAllTestUsers();

  console.log("creating demo-owner@involoop.app");
  const owner = await signupUser("demo-owner@involoop.app", "Budi Santoso (Freelancer)");
  console.log("  credits:", owner.credits);

  console.log("publishing invoice for demo-owner");
  const { data: inv, error: pubErr } = await admin.rpc("publish_invoice", {
    p_owner_id: owner.id,
    p_client_name: "PT Kreatif Digital",
    p_description: "Pengembangan landing page 5 halaman + integrasi WhatsApp",
    p_amount: 2500000,
    p_currency: "IDR",
    p_due_date: "2026-08-20",
    p_cta_message: "Kalau PT Kreatif Digital juga menagih klien, cobain Involoop buat invoice dengan satu kalimat.",
  });
  if (pubErr) throw pubErr;

  console.log("creating demo-client@involoop.app via referral");
  const client = await signupUser("demo-client@involoop.app", "Rina Wijaya (Klien)", inv.public_id);
  console.log("  client credits:", client.credits, "rewarded:", client.rewarded_referrer);

  const { data: bal } = await admin.from("profiles").select("free_invoice_credits").eq("id", owner.id).single();
  console.log("owner final credits:", bal.free_invoice_credits);

  console.log("\nINVOICE URL:", `${process.env.NEXT_PUBLIC_BASE_URL}/invoice/${inv.public_id}`);
  console.log("INVOICE NUMBER:", inv.number);
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
