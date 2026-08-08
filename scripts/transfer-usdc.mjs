// scripts/transfer-usdc.mjs
//
// Test harness untuk membayar invoice/paket USDC di Solana Devnet, tanpa
// membuka Phantom. Mengikuti quickstart Circle (developers.circle.com →
// quickstart-transfer-10-usdc-on-solana), diadaptasi supaya:
//   - memakai RPC dari .env.local (SOLANA_RPC_URL), bukan RPC publik
//   - membuat ATA penerima secara otomatis bila belum ada (peringatan utama
//     dari guide Circle: transfer SPL GAGAL kalau ATA tujuan belum pernah
//     dibuat)
//   - menyertakan reference read-only di instruksi transfer, persis seperti
//     Solana Pay — supaya backend Involoop bisa menemukan transaksinya
//
// Hanya untuk pengujian. JANGAN pernah pakai private key asli di sini.
//
// Pemakaian:
//   node scripts/transfer-usdc.mjs generate
//       → buat wallet baru, cetak alamat + private key (untuk di-funding)
//
//   node scripts/transfer-usdc.mjs pay --url "solana:...?..."
//       [--key <base58 | "[...]">] [--simulate]
//       → kirim USDC sesuai URL Solana Pay (dari QR atau /api/payments/crypto)
//         Sender diambil dari TEST_SENDER_PRIVATE_KEY (JSON array) atau --key.
//
//   node scripts/transfer-usdc.mjs balance <address>
//       → cek SOL, USDC, dan status ATA sebuah alamat

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AccountRole,
  appendTransactionMessageInstruction,
  createKeyPairSignerFromBytes,
  createKeyPairSignerFromPrivateKeyBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  getSignatureFromTransaction,
  getTransactionCodec,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstruction,
  getTransferCheckedInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import nacl from "tweetnacl";
import bs58 from "bs58";

const b58 = bs58.default ?? bs58;

const DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const USDC_DECIMALS = 6;
const SOL_LAMPORTS = 1_000_000_000n;

// ---------------------------------------------------------------------------
// Env: pakai process.env lebih dulu (cocok dengan `node --env-file=.env.local`),
// lalu fallback ke .env.local yang dibaca manual, seperti scripts/seed-demo.mjs.
// ---------------------------------------------------------------------------
function loadEnv() {
  const out = { ...process.env };
  try {
    const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
    const lines = fs.readFileSync(path.join(root, ".env.local"), "utf8").split("\n");
    for (const line of lines) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !(m[1] in out)) out[m[1]] = m[2].trim();
    }
  } catch {
    // tidak ada .env.local — lanjut dengan env yang sudah ada
  }
  return out;
}

const env = loadEnv();
const rpcUrl = env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const rpc = createSolanaRpc(rpcUrl);
const rpcSubscriptions = createSolanaRpcSubscriptions(rpcUrl.replace(/^https:/, "wss:"));

const MINT = env.SOLANA_USDC_MINT || DEVNET_USDC_MINT;

function log(...args) {
  console.log(...args);
}
function die(msg, code = 1) {
  console.error(`\n✗ ${msg}`);
  process.exit(code);
}

// ---------------------------------------------------------------------------
// String → base units, tanpa float. "5" → 5000000, "0.005" → 5000.
// ---------------------------------------------------------------------------
function toBaseUnits(amount, decimals) {
  const neg = amount.startsWith("-");
  const s = amount.replace("-", "").trim();
  const [whole, frac = ""] = s.split(".");
  const padded = frac.padEnd(decimals, "0").slice(0, decimals);
  const digits = whole + padded;
  if (!/^\d+$/.test(digits)) throw new Error(`amount bukan angka: "${amount}"`);
  const value = BigInt(digits.replace(/^0+(?=\d)/, "") || "0");
  return neg ? -value : value;
}

// ---------------------------------------------------------------------------
// Baca keypair dari base58 (64B keypair atau 32B seed) atau JSON array 64B.
// ---------------------------------------------------------------------------
async function signerFromKeySpec(spec) {
  const trimmed = spec.trim();
  let bytes;
  if (trimmed.startsWith("[")) {
    bytes = Uint8Array.from(JSON.parse(trimmed));
  } else {
    bytes = b58.decode(trimmed);
  }
  if (bytes.length === 64) return createKeyPairSignerFromBytes(bytes);
  if (bytes.length === 32) return createKeyPairSignerFromPrivateKeyBytes(bytes);
  throw new Error("private key harus 32 byte (seed) atau 64 byte (keypair)");
}

async function getSender() {
  const key = process.env.TEST_SENDER_PRIVATE_KEY;
  if (!key) {
    die("Tidak ada sender. Set TEST_SENDER_PRIVATE_KEY (JSON array byte) atau pakai --key <base58|json>.");
  }
  return signerFromKeySpec(key);
}

function parseSolanaUrl(url) {
  const m = url.match(/^solana:([^?]+)\??(.*)$/);
  if (!m) throw new Error(`URL bukan solana:... yang sah: ${url}`);
  const params = new URLSearchParams(m[2]);
  const amount = params.get("amount");
  const mint = params.get("spl-token") || MINT;
  const reference = params.get("reference") || null;
  if (!amount) throw new Error("URL tidak memuat amount");
  return { recipient: m[1], amount, mint, reference };
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

async function cmdGenerate() {
  const kp = nacl.sign.keyPair();
  log("ALAMAT        :", b58.encode(kp.publicKey));
  log("PRIVATE KEY   :", JSON.stringify(Array.from(kp.secretKey)));
  log("PRIVATE B58   :", b58.encode(kp.secretKey));
  log("");
  log("Funding untuk devnet:");
  log("  SOL  → faucet.solana.com   (tempel ALAMAT)");
  log("  USDC → faucet.circle.com   (pilih Solana Devnet, tempel ALAMAT)");
  log("");
  log("Lalu bayar pakai:");
  log(`  TEST_SENDER_PRIVATE_KEY="${JSON.stringify(Array.from(kp.secretKey))}" node scripts/transfer-usdc.mjs pay --url "solana:..."`);
}

async function cmdBalance(address) {
  const sol = await rpc.getBalance(address).send();
  log("SOL :", (Number(sol.value) / 1e9).toFixed(9));
  const [ata] = await findAssociatedTokenPda({
    owner: address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    mint: MINT,
  });
  const acct = await rpc.getAccountInfo(ata, { encoding: "base64" }).send();
  if (!acct.value) {
    log("USDC: 0 (ATA belum ada — transfer ke alamat ini akan GAGAL sampai ATA dibuat)");
    return;
  }
  const bal = await rpc.getTokenAccountBalance(ata).send();
  log("USDC:", bal.value.uiAmountString ?? "0");
  log("ATA :", ata);
}

async function cmdPay({ url, keySpec, simulate, inspect }) {
  const { recipient, amount, mint, reference } = parseSolanaUrl(url);
  const amountUnits = toBaseUnits(amount, USDC_DECIMALS);

  const sender = keySpec ? await signerFromKeySpec(keySpec) : await getSender();
  log("PENGIRIM  :", sender.address);
  log("PENERIMA  :", recipient);
  log("JUMLAH    :", amount, "USDC  (", amountUnits, "base units )");
  log("MINT      :", mint);
  if (reference) log("REFERENCE :", reference);
  else log("PERINGATAN: tanpa reference, backend Involoop tidak bisa menemukan transaksi ini.");

  if (mint !== MINT) {
    die(`Mint "${mint}" berbeda dari mint devnet yang dikenal ("${MINT}"). Hati-hati!`);
  }

  const [senderAta] = await findAssociatedTokenPda({
    owner: sender.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    mint,
  });
  const [recipientAta] = await findAssociatedTokenPda({
    owner: recipient,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    mint,
  });

  // Cek saldo pengirim. Faucet Circle mengisi ATA ini; kalau belum ada, err.
  const senderAcct = await rpc.getAccountInfo(senderAta, { encoding: "base64" }).send();
  if (!senderAcct.value) {
    die(`ATA pengirim tidak ada: ${senderAta}\nFunding USDC dulu via faucet.circle.com ke ${sender.address}, atau pakai wallet yang sudah punya USDC.`);
  }
  const senderBal = await rpc.getTokenAccountBalance(senderAta).send();
  if (BigInt(senderBal.value.amount) < amountUnits) {
    die(`Saldo pengirim kurang: ${senderBal.value.uiAmountString} USDC (butuh ${amount}).`);
  }

  const instructions = [];

  // ATA penerima harus ada — kalau tidak, transfer SPL gagal. Buat dulu.
  const recipientAcct = await rpc.getAccountInfo(recipientAta, { encoding: "base64" }).send();
  if (!recipientAcct.value) {
    log("→ Membuat ATA penerima (baru pertama kali):", recipientAta);
    instructions.push(
      getCreateAssociatedTokenIdempotentInstruction({ payer: sender, owner: recipient, mint })
    );
  }

  // Instruksi transfer SPL: transferChecked (mint + decimals dijaga ketat).
  const transfer = getTransferCheckedInstruction({
    source: senderAta,
    mint,
    destination: recipientAta,
    authority: sender,
    amount: amountUnits,
    decimals: USDC_DECIMALS,
  });

  // Reference disisipkan sebagai akun read-only non-signer, persis cara
  // Solana Pay — backend menemukan transaksi lewat akun ini (getSignaturesForAddress).
  const withReference = reference
    ? { ...transfer, accounts: [...transfer.accounts, { address: reference, role: AccountRole.READONLY }] }
    : transfer;
  instructions.push(withReference);

  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(sender, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
    ...instructions.map((ix) => (m) => appendTransactionMessageInstruction(ix, m))
  );
  const signed = await signTransactionMessageWithSigners(message);
  const signature = getSignatureFromTransaction(signed);
  const explorer = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

  if (simulate) {
    log("\nSimulasi (tidak dikirim)...");
    const bytes = getTransactionCodec().encode(signed);
    const sim = await rpc.simulateTransaction(bytes, {
      encoding: "base64",
      replaceRecentBlockhash: true,
    }).send();
    if (sim.value.err) {
      log("HASIL SIMULASI:", JSON.stringify(sim.value.err, null, 2));
      die("Simulasi gagal.");
    }
    log("Simulasi OK.");
    return;
  }

  if (inspect) {
    const { getCompiledTransactionMessageCodec } = await import("@solana/kit");
    const msg = getCompiledTransactionMessageCodec().decode(signed.messageBytes);
    log("\n— INSPECT (tidak dikirim) —");
    log("staticAccounts :", msg.staticAccounts.join(", "));
    log("header         :", JSON.stringify(msg.header));
    log("instructions   :", JSON.stringify(msg.instructions.map((i) => i.accountIndices)));
    log("signature      :", signature);
    return;
  }

  const sendAndConfirm = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });
  await sendAndConfirm(signed, { commitment: "confirmed" });
  log("\n✓ TERKIRIM");
  log("  Signature:", signature);
  log("  Explorer :", explorer);
  if (reference) {
    log("\n  Backend akan menemukannya via status endpoint:");
    log("  GET /api/payments/crypto/status?reference=" + reference);
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
async function main() {
  const [mode, ...rest] = process.argv.slice(2);
  if (mode === "generate") {
    await cmdGenerate();
  } else if (mode === "balance") {
    await cmdBalance(rest[0]);
  } else if (mode === "pay") {
    const args = new Map();
    for (let i = 0; i < rest.length; i++) {
      const a = rest[i];
      if (a.startsWith("--")) args.set(a, rest[i + 1]);
    }
    const url = args.get("--url");
    if (!url) die("--url <solana:...> wajib.");
    await cmdPay({
      url,
      keySpec: args.get("--key"),
      simulate: args.has("--simulate"),
      inspect: args.has("--inspect"),
    });
  } else {
    die(
      "Pemakaian:\n" +
        "  node scripts/transfer-usdc.mjs generate\n" +
        "  node scripts/transfer-usdc.mjs pay --url \"solana:...\" [--key <base58|json>] [--simulate] [--inspect]\n" +
        "  node scripts/transfer-usdc.mjs balance <alamat>"
    );
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("\n✗", err?.message ?? err);
  process.exit(1);
});
