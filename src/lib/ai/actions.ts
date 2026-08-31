"use server"

import { draftCopy } from "./api"
import type { CopyAssistContext } from "./types"

/** Bound to CopyAssistButton's click handler (called directly, not via a <form>). */
export async function draftCopyAction(context: CopyAssistContext): Promise<string> {
  return draftCopy(context)
}
