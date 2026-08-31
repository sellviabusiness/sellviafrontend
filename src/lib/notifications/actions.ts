"use server"

import { revalidatePath } from "next/cache"

import { markAllNotificationsRead } from "./api"

/** Bound to the "Mark all read" control in the bell dropdown. */
export async function markAllReadAction() {
  await markAllNotificationsRead()
  // Shell renders in every role layout — revalidate broadly rather than
  // guessing which role's path the user is currently under.
  revalidatePath("/", "layout")
}
