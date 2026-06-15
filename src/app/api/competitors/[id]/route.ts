import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const competitor = await prisma.competitor.findFirst({
    where: { id: params.id, agencyId: session.user.agencyId },
    include: {
      reviews: { orderBy: { publishedAt: "desc" }, take: 20 },
      snapshots: { orderBy: { snapshotDate: "desc" }, take: 30 },
      _count: { select: { reviews: true } },
    },
  });

  if (!competitor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: competitor });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const competitor = await prisma.competitor.findFirst({
    where: { id: params.id, agencyId: session.user.agencyId },
  });
  if (!competitor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.competitor.update({ where: { id: params.id }, data: body });
  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const competitor = await prisma.competitor.findFirst({
    where: { id: params.id, agencyId: session.user.agencyId },
  });
  if (!competitor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.competitor.update({ where: { id: params.id }, data: { isActive: false } });
  return NextResponse.json({ message: "Competitor removed" });
}
