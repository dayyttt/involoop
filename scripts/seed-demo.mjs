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
    p_client_name: "Acme Studio",
    p_description: "Landing page design (5 pages + copy)",
    p_amount: 50,
    p_currency: "USD",
    p_due_date: "2026-08-12",
    p_cta_message: "If Acme Studio bills its own clients too, try Involoop · create an invoice from one sentence.",
  });
  if (pubErr) throw pubErr;

  if (e.STRIPE_SECRET_KEY) {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(e.STRIPE_SECRET_KEY);
    try {
      console.log("connecting Stripe test account for demo-owner");
      const account = await stripe.accounts.create({
        type: "custom",
        email: "demo-owner@involoop.app",
        business_type: "individual",
        individual: { first_name: "Budi", last_name: "Santoso" },
        tos_acceptance: { date: Math.floor(Date.now() / 1000), ip: "0.0.0.0", user_agent: "Involoop seed" },
        business_profile: { mcc: "7311", url: "https://involoop.vercel.app" },
        capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
        external_account: {
          object: "bank_account",
          country: "US",
          currency: "usd",
          routing_number: "110000000",
          account_number: "000123456789",
        },
      });
      await admin
        .from("profiles")
        .update({ stripe_account_id: account.id, stripe_status: "connected" })
        .eq("id", owner.id);
      console.log("stripe connected:", account.id);
    } catch (e2) {
      // Sandbox without Connect enabled: platform-checkout still works.
      console.log("Connect not available (" + e2.message + ") · using sandbox platform checkout");
    }
  } else {
    console.log("STRIPE_SECRET_KEY not set · skipping Stripe connect (Pay button will be hidden)");
  }

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
