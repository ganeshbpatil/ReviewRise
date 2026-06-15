import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ReviewsChart } from "@/components/dashboard/reviews-chart";
import { RecentReviews } from "@/components/dashboard/recent-reviews";
import { AiRecommendations } from "@/components/dashboard/ai-recommendations";
import { RatingDistribution } from "@/components/dashboard/rating-distribution";
import { startOfMonth, subMonths, endOfMonth } from "date-fns";
import {
  Star, Users, MapPin, MessageSquare,
  TrendingUp, Shield, Zap, Clock,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const agencyId = session!.user.agencyId;

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
    ratingDistribution,
    recentReviews,
    aiRecommendations,
    sentimentBreakdown,
  ] = await Promise.all([
    prisma.client.count({ where: { agencyId, isActive: true } }),
    prisma.location.count({ where: { agencyId, isActive: true } }),
    prisma.googleReview.count({ where: { agencyId } }),
    prisma.googleReview.count({ where: { agencyId, status: "PENDING" } }),
    prisma.googleReview.count({ where: { agencyId, publishedAt: { gte: thisMonthStart } } }),
    prisma.googleReview.count({ where: { agencyId, publishedAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    prisma.googleReview.aggregate({ where: { agencyId }, _avg: { rating: true } }),
    prisma.googleReview.groupBy({ by: ["rating"], where: { agencyId }, _count: true, orderBy: { rating: "desc" } }),
    prisma.googleReview.findMany({
      where: { agencyId },
      include: {
        profile: { select: { locationName: true } },
        reply: { select: { isPublished: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: 5,
    }),
    prisma.aiRecommendation.findMany({
      where: { agencyId, status: "pending" },
      orderBy: [{ priority: "asc" }, { impactScore: "desc" }],
      take: 4,
    }),
    prisma.googleReview.groupBy({
      by: ["sentiment"],
      where: { agencyId, sentiment: { not: null } },
      _count: true,
    }),
  ]);

  const avgRating = ratingStats._avg.rating ?? 0;
  const repliedCount = totalReviews - pendingReplies;
  const replyRate = totalReviews > 0 ? Math.round((repliedCount / totalReviews) * 100) : 0;
  const reputationScore = Math.round((avgRating / 5) * 50 + Math.min(totalReviews / 100, 1) * 30 + (replyRate / 100) * 20);
  const reviewGrowth = reviewsLastMonth > 0
    ? Math.round(((reviewsThisMonth - reviewsLastMonth) / reviewsLastMonth) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agency Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Reputation intelligence overview across all clients
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Active Clients"
          value={totalClients}
          icon={Users}
          color="blue"
        />
        <KpiCard
          title="Total Locations"
          value={totalLocations}
          icon={MapPin}
          color="green"
        />
        <KpiCard
          title="Avg Rating"
          value={avgRating.toFixed(1)}
          icon={Star}
          color="yellow"
          suffix="/5"
        />
        <KpiCard
          title="Reputation Score"
          value={reputationScore}
          icon={Shield}
          color="purple"
          suffix="/100"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Reviews"
          value={totalReviews}
          icon={MessageSquare}
          color="blue"
        />
        <KpiCard
          title="Pending Replies"
          value={pendingReplies}
          icon={Clock}
          color="orange"
          alert={pendingReplies > 0}
        />
        <KpiCard
          title="This Month"
          value={reviewsThisMonth}
          icon={TrendingUp}
          color="green"
          trend={reviewGrowth}
        />
        <KpiCard
          title="Reply Rate"
          value={replyRate}
          icon={Zap}
          color="teal"
          suffix="%"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ReviewsChart agencyId={agencyId} />
        </div>
        <RatingDistribution data={ratingDistribution} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentReviews reviews={recentReviews as any} />
        <AiRecommendations recommendations={aiRecommendations} />
      </div>
    </div>
  );
}
