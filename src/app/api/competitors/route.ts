import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  clientId: z.string(),
  name: z.string().min(1).max(100),
  placeId: z.string().optional(),
  googleMapsUrl: z.string().url().optional(),
  website: z.string().url().optional(),
  category: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  const competitors = await prisma.competitor.findMany({
    where: {
      agencyId: session.user.agencyId,
      ...(clientId && { clientId }),
      isActive: true,
    },
    include: {
      snapshots: {
        orderBy: { snapshotDate: "desc" },
        take: 6,
      },
      _count: { select: { reviews: true } },
    },
    orderBy: { avgRating: "desc" },
  });

  return NextResponse.json({ data: competitors });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const competitor = await prisma.competitor.create({
    data: {
      ...parsed.data,
      agencyId: session.user.agencyId,
    },
  });

  return NextResponse.json({ data: competitor }, { status: 201 });
}
