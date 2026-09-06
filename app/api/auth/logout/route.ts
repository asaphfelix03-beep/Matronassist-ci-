import { handleRouteError, ok } from "@/lib/api-auth"
import { destroySession } from "@/lib/session"

export const dynamic = "force-dynamic"

export async function POST() {
  try {
    await destroySession()
    return ok({ loggedOut: true })
  } catch (err) {
    return handleRouteError(err, "/api/auth/logout")
  }
}
