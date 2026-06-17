import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]).optional(),
  customMessage: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaign = await prisma.reviewCampaign.findFirst({
    where: { id: params.id, agencyId: session.user.agencyId },
    include: {
      client: { select: { name: true } },
      location: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 50 },
      analytics: { orderBy: { date: "desc" }, take: 30 },
      _count: { select: { messages: true } },
    },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: campaign });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const campaign = await prisma.reviewCampaign.findFirst({
    where: { id: params.id, agencyId: session.user.agencyId },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.reviewCampaign.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      ...(parsed.data.scheduledAt && { scheduledAt: new Date(parsed.data.scheduledAt) }),
      ...(parsed.data.status === "COMPLETED" && { completedAt: new Date() }),
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaign = await prisma.reviewCampaign.findFirst({
    where: { id: params.id, agencyId: session.user.agencyId },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.reviewCampaign.update({
    where: { id: params.id },
    data: { status: "ARCHIVED" },
  });

  return NextResponse.json({ message: "Campaign archived" });
}
