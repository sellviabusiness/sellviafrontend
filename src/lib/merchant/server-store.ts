"use server";

import { readJsonFile, writeJsonFile } from "@/lib/server-store/file-kv";
import type { MerchantRecord } from "./types";

/**
 * Server Actions (Next.js RPC — callable directly from "use client" components, runs in the
 * Node process behind `next dev`/`next start`) backing the ENTIRE merchant/offer/application/
 * sale domain. This is the ONE thing lib/merchant/store.ts's `readAll`/`writeAll` now call —
 * every exported function in that file is async as a direct result (a network round-trip can't
 * be sync), and every one of its ~20 callers across the app was updated to `await` it.
 *
 * Why the WHOLE domain, not just the cross-account reads (getAllLiveOffersForDiscovery etc.):
 * a Creator's application write (applyToOfferAsCreator) mutates the OWNING MERCHANT's own
 * record. If only cross-account reads were server-backed while a merchant's "own" reads/writes
 * stayed on localStorage, a creator's application (written to the shared server) would never
 * show up in the merchant's OWN Applications screen (still reading their own browser's
 * localStorage) — same bug, one hop later. The whole record has to live in one place.
 */

const FILE = "merchant.json";

export async function readAllMerchantRecords(): Promise<Record<string, MerchantRecord>> {
  return readJsonFile<Record<string, MerchantRecord>>(FILE, {});
}

export async function writeAllMerchantRecords(all: Record<string, MerchantRecord>): Promise<void> {
  await writeJsonFile(FILE, all);
}
