import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { z } from "zod";

const createCampaignSchema = z.object({
  clientId: z.string(),
  locationId: z.string().optional(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  type: z.enum(["EMAIL", "SMS", "WHATSAPP", "QR_CODE", "LINK"]),
  targetRating: z.number().min(1).max(5).default(5),
  reviewLink: z.string().url().optional(),
  customMessage: z.string().optional(),
  subject: z.string().optional(),
  fromName: z.string().optional(),
  fromEmail: z.string().email().optional(),
  scheduledAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  const campaigns = await prisma.reviewCampaign.findMany({
    where: {
      agencyId: session.user.agencyId,
      ...(clientId && { clientId }),
    },
    include: {
      client: { select: { name: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: campaigns });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasPermission(session.user.role, "campaign:create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createCampaignSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const client = await prisma.client.findFirst({
    where: { id: parsed.data.clientId, agencyId: session.user.agencyId },
  });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const campaign = await prisma.reviewCampaign.create({
    data: {
      ...parsed.data,
      agencyId: session.user.agencyId,
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined,
    },
  });

  return NextResponse.json({ data: campaign }, { status: 201 });
}
