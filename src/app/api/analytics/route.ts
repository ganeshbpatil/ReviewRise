import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, subMonths, endOfMonth } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  const agencyId = session.user.agencyId;
  const baseWhere = { agencyId, ...(clientId && { clientId }) };

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const [
    totalClients,
    totalLocations,
    totalReviews,
    pendingReplies,
    reviewsThisMonth,
    reviewsLastMonth,
    ratingStats,
    sentimentBreakdown,
    ratingDistribution,
    recentActivity,
  ] = await Promise.all([
    prisma.client.count({ where: { agencyId, isActive: true } }),
    prisma.location.count({ where: { agencyId, isActive: true } }),
    prisma.googleReview.count({ where: baseWhere }),
    prisma.googleReview.count({ where: { ...baseWhere, status: "PENDING" } }),
    prisma.googleReview.count({
      where: { ...baseWhere, publishedAt: { gte: thisMonthStart } },
    }),
    prisma.googleReview.count({
      where: { ...baseWhere, publishedAt: { gte: lastMonthStart, lte: lastMonthEnd } },
    }),
    prisma.googleReview.aggregate({
      where: baseWhere,
      _avg: { rating: true, sentimentScore: true },
    }),
    prisma.googleReview.groupBy({
      by: ["sentiment"],
      where: { ...baseWhere, sentiment: { not: null } },
      _count: true,
    }),
    prisma.googleReview.groupBy({
      by: ["rating"],
      where: baseWhere,
      _count: true,
      orderBy: { rating: "desc" },
    }),
    prisma.googleReview.findMany({
      where: baseWhere,
      include: {
        profile: { select: { locationName: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: 10,
    }),
  ]);

  const avgRating = ratingStats._avg.rating ?? 0;
  const replyRate = totalReviews > 0
    ? (totalReviews - pendingReplies) / totalReviews
    : 0;

  const reputationScore = Math.round(
    (avgRating / 5) * 50 +
    Math.min(totalReviews / 100, 1) * 30 +
    replyRate * 20
  );

  return NextResponse.json({
    data: {
      kpis: {
        totalClients,
        totalLocations,
        totalReviews,
        avgRating,
        pendingReplies,
        reputationScore,
        reviewsThisMonth,
        reviewsLastMonth,
        ratingChange: avgRating - (ratingStats._avg.rating ?? 0),
      },
      sentimentBreakdown,
      ratingDistribution,
      recentActivity,
    },
  });
}
