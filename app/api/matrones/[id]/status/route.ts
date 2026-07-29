import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: Request, context: any) {
  try {
    const { params } = context
    const id = params?.id
    const body = await request.json()
    if (!body || typeof body.status !== "string") {
      return NextResponse.json({ success: false, message: "Missing status" }, { status: 400 })
    }

    const updated = await prisma.matrone.update({ where: { id }, data: { status: body.status, lastActive: body.lastActive ?? undefined } })
    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    console.error("/api/matrones/[id]/status PATCH error", err)
    return NextResponse.json({ success: false, message: "Internal error" }, { status: 500 })
  }
}
