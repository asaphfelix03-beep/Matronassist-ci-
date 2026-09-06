import { handleRouteError, ok, requireUser } from "@/lib/api-auth"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    return ok(await requireUser())
  } catch (err) {
    return handleRouteError(err, "/api/auth/me")
  }
}
