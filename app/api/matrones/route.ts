import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const matrones = await prisma.matrone.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ success: true, data: matrones })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body || !body.name || !body.region) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    const newM = await prisma.matrone.create({
      data: {
        name: body.name,
        region: body.region,
        email: body.email ?? null,
        phone: body.phone ?? null,
        patients: body.patients ?? 0,
        status: body.status ?? 'active',
        lastActive: body.lastActive ?? 'Maintenant',
      },
    })

    return NextResponse.json({ success: true, data: newM }, { status: 201 })
  } catch (err) {
    console.error("/api/matrones POST error", err)
    return NextResponse.json({ success: false, message: "Internal error" }, { status: 500 })
  }
}
