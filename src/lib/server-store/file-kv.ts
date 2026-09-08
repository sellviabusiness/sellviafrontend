import "server-only";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

/**
 * Generic JSON-file-backed key-value persistence, server-only. Backs every genuinely
 * cross-browser-shared mock domain store (see lib/merchant/server-store.ts, the first
 * consumer) — this file has no domain knowledge, just read/write-a-JSON-file plumbing.
 *
 * Root cause this exists to fix: every other lib/*\/store.ts in this app persists to
 * `localStorage`, which is scoped to one browser profile. Two real, separate browser
 * profiles (or two different devices) never share that data — a Merchant's write in Profile A
 * is invisible to a Creator reading in Profile B, because they're not reading the same storage
 * at all. Files under here live in the Node process running `next dev`/`next start` — the ONE
 * process every browser's requests actually go through — so this genuinely is shared state,
 * the same way a real backend's database would be.
 *
 * Stored under `.mock-data/` at the repo root (gitignored) — deliberately a real file, not an
 * in-memory object, so state survives a dev-server restart too, not just page reloads.
 *
 * Concurrency: writes are serialized through an in-process promise queue (below) so two
 * near-simultaneous writes from different browsers can't interleave and corrupt the file.
 * There is NO read-then-modify-then-write transaction lock across the read+write pair a
 * caller does at a higher level (lib/merchant/store.ts's getRecord+saveRecord, for example) —
 * two truly simultaneous mutations to the SAME record from two different browsers could still
 * lose one of the two updates (last write wins). Acceptable for this app's actual use (manual,
 * one-person-at-a-time cross-browser testing), not a real transactional guarantee. Flagged,
 * not hidden.
 */

const DATA_DIR = path.join(process.cwd(), ".mock-data");

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function readJsonFile<T>(fileName: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path.join(DATA_DIR, fileName), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    // File missing (first run) or unreadable/corrupt — fall back rather than throw, same
    // "never let a mock-storage hiccup crash a real screen" discipline as every localStorage
    // read in this app's other store files.
    return fallback;
  }
}

// One write queue per file name, so writes to *different* files (merchant.json vs a future
// domain's own file) never block each other, but writes to the SAME file always run in order.
const writeQueues = new Map<string, Promise<void>>();

export async function writeJsonFile<T>(fileName: string, data: T): Promise<void> {
  const previous = writeQueues.get(fileName) ?? Promise.resolve();
  const next = previous
    .catch(() => {}) // a prior failed write must not permanently wedge the queue
    .then(async () => {
      await ensureDataDir();
      await writeFile(path.join(DATA_DIR, fileName), JSON.stringify(data), "utf-8");
    });
  writeQueues.set(fileName, next);
  return next;
}
