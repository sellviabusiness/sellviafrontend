import "server-only";
import { cookies } from "next/headers";
import { MOCK_SESSION_COOKIE, parseMockSessionCookie } from "./session-cookie";
import type { AppSession } from "../types";

export async function getMockServerSession(): Promise<AppSession | null> {
  const store = await cookies();
  return parseMockSessionCookie(store.get(MOCK_SESSION_COOKIE)?.value);
}
