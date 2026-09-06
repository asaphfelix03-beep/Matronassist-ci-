import { redirect } from "next/navigation"

import { ChangePasswordForm } from "@/components/change-password-form"
import { getSessionUser } from "@/lib/session"

export const dynamic = "force-dynamic"

export default async function ChangePasswordPage() {
  const user = await getSessionUser()
  if (!user) redirect("/login")

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <ChangePasswordForm forced={user.mustChangePassword} />
    </div>
  )
}
