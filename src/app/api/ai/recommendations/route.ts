import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAiRecommendations } from "@/lib/ai";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  const where = {
    agencyId: session.user.agencyId,
    ...(clientId && { clientId }),
    status: "pending",
  };

  const recommendations = await prisma.aiRecommendation.findMany({
    where,
    orderBy: [{ priority: "asc" }, { impactScore: "desc" }],
    take: 20,
  });

  return NextResponse.json({ data: recommendations });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { clientId } = body;

  const [client, reviewStats, pendingReplies] = await Promise.all([
    prisma.client.findFirst({
      where: { id: clientId, agencyId: session.user.agencyId },
    }),
    prisma.googleReview.aggregate({
      where: { clientId, agencyId: session.user.agencyId },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.googleReview.count({
      where: { clientId, agencyId: session.user.agencyId, status: "PENDING" },
    }),
  ]);

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const settings = await prisma.agencySettings.findUnique({
    where: { agencyId: session.user.agencyId },
  });

  const recommendations = await generateAiRecommendations({
    businessName: client.name,
    avgRating: reviewStats._avg.rating ?? 0,
    totalReviews: reviewStats._count,
    pendingReplies,
    lastMonthReviews: 0,
    negativeReviews: 0,
    apiKey: settings?.anthropicApiKey || undefined,
  });

  const created = await prisma.$transaction(
    recommendations.map((rec) =>
      prisma.aiRecommendation.create({
        data: {
          agencyId: session.user.agencyId,
          clientId,
          title: rec.title,
          description: rec.description,
          category: rec.category,
          priority: rec.priority,
          impactScore: rec.impactScore,
          estimatedResult: rec.estimatedResult,
        },
      })
    )
  );

  return NextResponse.json({ data: created });
}
