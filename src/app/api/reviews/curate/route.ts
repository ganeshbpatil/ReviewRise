import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  clientId: z.string(),
  criteria: z.enum([
    "best",
    "most_persuasive",
    "most_detailed",
    "highest_rated",
    "most_emotional",
    "most_helpful",
  ]).optional().default("best"),
  limit: z.number().min(1).max(50).optional().default(10),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { clientId, criteria, limit } = parsed.data;
  const agencyId = session.user.agencyId;

  let reviews;

  switch (criteria) {
    case "highest_rated":
      reviews = await prisma.googleReview.findMany({
        where: { clientId, agencyId, rating: 5, comment: { not: null } },
        orderBy: [{ sentimentScore: "desc" }, { publishedAt: "desc" }],
        take: limit,
      });
      break;

    case "most_detailed":
      reviews = await prisma.googleReview.findMany({
        where: { clientId, agencyId, comment: { not: null } },
        orderBy: { publishedAt: "desc" },
        take: limit * 3,
      });
      reviews = reviews
        .filter((r) => (r.comment?.length || 0) > 100)
        .sort((a, b) => (b.comment?.length || 0) - (a.comment?.length || 0))
        .slice(0, limit);
      break;

    case "most_emotional":
      reviews = await prisma.googleReview.findMany({
        where: {
          clientId, agencyId, comment: { not: null },
          sentiment: { in: ["VERY_POSITIVE", "VERY_NEGATIVE"] },
        },
        orderBy: [{ rating: "desc" }, { publishedAt: "desc" }],
        take: limit,
      });
      break;

    case "most_persuasive":
    case "most_helpful":
    case "best":
    default:
      reviews = await prisma.googleReview.findMany({
        where: {
          clientId, agencyId,
          rating: { gte: 4 },
          comment: { not: null },
          sentiment: { in: ["VERY_POSITIVE", "POSITIVE"] },
        },
        orderBy: [{ sentimentScore: "desc" }, { rating: "desc" }],
        take: limit,
        include: {
          analysis: { select: { keywords: true, positiveSignals: true, categories: true } },
        },
      });
  }

  // Mark as curated
  const ids = reviews.map((r) => r.id);
  await prisma.googleReview.updateMany({
    where: { id: { in: ids } },
    data: { isCurated: true, curatedReason: criteria },
  });

  return NextResponse.json({ data: { reviews, count: reviews.length, criteria } });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  const curated = await prisma.googleReview.findMany({
    where: {
      agencyId: session.user.agencyId,
      ...(clientId && { clientId }),
      isCurated: true,
    },
    include: {
      analysis: { select: { keywords: true, categories: true, positiveSignals: true } },
      profile: { select: { locationName: true } },
      assets: { select: { id: true, assetType: true, status: true } },
    },
    orderBy: [{ rating: "desc" }, { sentimentScore: "desc" }],
    take: 50,
  });

  return NextResponse.json({ data: curated });
}
