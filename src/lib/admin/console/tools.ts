import type { ConsoleTool } from "./types";
import {
  getMarketplaceHealth,
  getFlags,
  getUserSummaries,
  getTicketContext,
  computeMonthlyPnl,
  suspendUser,
  clearFlag,
  decideVetting,
  getVettingQueue,
  decideRefundRequest,
  getPendingRefundRequests,
} from "@/lib/admin/store";

/**
 * Playbook 07 G9 — the tool registry. Every tool wraps a function lib/admin/store.ts already
 * exports (the same functions the click-through dashboard screens call) — never a new code path.
 * This is the ONE file that changes at handoff, one tool at a time, as real backend endpoints
 * come online — engine.ts (the safety layer) and this file's own `kind`/`describeSideEffects`
 * never change, per rule 5.
 */
export const CONSOLE_TOOLS: ConsoleTool[] = [
  {
    name: "get_marketplace_health",
    kind: "read",
    description: "Active merchants/creators and liquidity ratio (G1).",
    run: async () => {
      const h = await getMarketplaceHealth();
      return { summary: `${h.activeMerchants} active merchants, ${h.activeCreators} active creators. Liquidity ratio: ${h.liquidityRatio ?? "n/a (no active merchants)"}.`, data: h };
    },
  },
  {
    name: "get_flags",
    kind: "read",
    description: "List unreviewed moderation flags (G2).",
    run: async () => {
      const flags = getFlags("unreviewed");
      return {
        summary: flags.length === 0 ? "No unreviewed flags." : `${flags.length} unreviewed flag(s):\n${flags.map((f) => `- ${f.entityLabel} (${f.rule})`).join("\n")}`,
        data: flags,
      };
    },
  },
  {
    name: "get_user",
    kind: "read",
    description: "Look up one user's roles, suspension state, and ticket context (G4).",
    run: async (args) => {
      const email = args.email;
      if (!email) return { summary: "No email provided." };
      const user = getUserSummaries().find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) return { summary: `No account found for ${email}.` };
      const context = await getTicketContext(email);
      return {
        summary: `${email} — roles: ${user.roles.join(", ") || "none"}, ${user.suspended ? "SUSPENDED" : "active"}. ${context.offerCount} offers, ${context.applicationCount} applications, ${context.saleCount} sales.`,
        data: { user, context },
      };
    },
  },
  {
    name: "get_pnl",
    kind: "read",
    description: "This month's platform-fee revenue and known cost lines (G10).",
    run: async () => {
      const month = new Date().toISOString().slice(0, 7);
      const pnl = await computeMonthlyPnl(month);
      return { summary: `${month}: platform fee revenue ${pnl.platformFeeRevenue}, hosting ${pnl.hostingCosts}, AI ${pnl.aiCosts}, other SaaS ${pnl.otherSaasCosts}. Switch processing fees not yet integrated.`, data: pnl };
    },
  },
  {
    name: "suspend_user",
    kind: "write",
    description: "Suspend an account and end its live offers (G4).",
    describeSideEffects: (args) => [`Marks ${args.email || "the account"} as suspended.`, "Ends every one of their live/paused offers."],
    run: async (args, actorEmail) => {
      if (!args.email) return { summary: "No email provided — cannot suspend." };
      await suspendUser(args.email, actorEmail, args.reason, "ai_console");
      return { summary: `${args.email} suspended.` };
    },
  },
  {
    name: "clear_flag",
    kind: "write",
    description: "Clear a moderation flag as a false positive (G2).",
    describeSideEffects: (args) => [`Marks flag ${args.flagId || "(unspecified)"} as cleared — no other effect.`],
    run: async (args, actorEmail) => {
      if (!args.flagId) return { summary: "No flag id provided." };
      const result = clearFlag(args.flagId, actorEmail, args.note, "ai_console");
      return { summary: result ? `Flag ${args.flagId} cleared.` : `No such flag: ${args.flagId}.` };
    },
  },
  {
    name: "approve_offer_vetting",
    kind: "write",
    description: "Approve a queued high-commission/high-risk offer to go live (G3).",
    describeSideEffects: (args) => [`Marks vetting item ${args.vettingId || "(unspecified)"} approved — the offer stays/becomes live.`],
    run: async (args, actorEmail) => {
      if (!args.vettingId) return { summary: "No vetting item id provided." };
      const result = await decideVetting(args.vettingId, "approved", actorEmail, "ai_console");
      return { summary: result ? `Vetting item ${args.vettingId} approved.` : `No such vetting item: ${args.vettingId}.` };
    },
  },
  {
    name: "reject_offer_vetting",
    kind: "write",
    description: "Reject a queued offer and end it (G3).",
    describeSideEffects: (args) => [`Marks vetting item ${args.vettingId || "(unspecified)"} rejected.`, "Ends the merchant's live/paused offers."],
    run: async (args, actorEmail) => {
      if (!args.vettingId) return { summary: "No vetting item id provided." };
      const result = await decideVetting(args.vettingId, "rejected", actorEmail, "ai_console");
      return { summary: result ? `Vetting item ${args.vettingId} rejected.` : `No such vetting item: ${args.vettingId}.` };
    },
  },
  {
    name: "trigger_refund",
    kind: "write",
    description: "Approve a pending refund-credit request (G5).",
    describeSideEffects: (args) => [`Approves the refund credit on sale ${args.saleId || "(unspecified)"}.`],
    run: async (args, actorEmail) => {
      const pending = (await getPendingRefundRequests()).find((o) => o.sale.id === args.saleId);
      if (!pending) return { summary: `No pending refund request found for sale ${args.saleId ?? "(unspecified)"}.` };
      const result = await decideRefundRequest(pending.merchantEmail, pending.sale.id, "approved", actorEmail, "ai_console");
      return { summary: result ? `Refund credit approved for sale ${args.saleId}.` : "Could not approve — already resolved?" };
    },
  },
  {
    name: "get_vetting_queue",
    kind: "read",
    description: "List offers pending vetting approval (G3).",
    run: async () => {
      const items = await getVettingQueue("pending");
      return { summary: items.length === 0 ? "Nothing pending vetting." : `${items.length} offer(s) pending: ${items.map((v) => v.offerId).join(", ")}`, data: items };
    },
  },
];

export function findTool(name: string): ConsoleTool | undefined {
  return CONSOLE_TOOLS.find((t) => t.name === name);
}
