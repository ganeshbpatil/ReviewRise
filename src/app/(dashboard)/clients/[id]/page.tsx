import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Star, MapPin, MessageSquare, TrendingUp, Shield, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const agencyId = session!.user.agencyId;

  const client = await prisma.client.findFirst({
    where: { id: params.id, agencyId },
    include: {
      locations: {
        include: {
          googleBusinessProfiles: {
            select: {
              id: true, locationName: true, avgRating: true,
              totalReviews: true, reputationScore: true, lastSyncedAt: true,
            },
          },
        },
      },
      _count: { select: { locations: true, campaigns: true, competitors: true } },
    },
  });

  if (!client) notFound();

  const [reviewStats, pendingReplies, recentReviews, campaigns] = await Promise.all([
    prisma.googleReview.aggregate({
      where: { clientId: client.id, agencyId },
      _avg: { rating: true, sentimentScore: true },
      _count: true,
    }),
    prisma.googleReview.count({
      where: { clientId: client.id, agencyId, status: "PENDING" },
    }),
    prisma.googleReview.findMany({
      where: { clientId: client.id, agencyId },
      include: { profile: { select: { locationName: true } } },
      orderBy: { publishedAt: "desc" },
      take: 5,
    }),
    prisma.reviewCampaign.findMany({
      where: { clientId: client.id, agencyId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const avgRating = reviewStats._avg.rating ?? 0;
  const totalReviews = reviewStats._count;
  const replyRate = totalReviews > 0 ? Math.round(((totalReviews - pendingReplies) / totalReviews) * 100) : 0;
  const reputationScore = Math.round((avgRating / 5) * 50 + Math.min(totalReviews / 100, 1) * 30 + (replyRate / 100) * 20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-xl">
            {client.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
              <Badge className={client.isActive ? "bg-green-100 text-green-700 border-0" : "bg-gray-100 text-gray-500 border-0"}>
                {client.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1">
              {client.industry && <span className="text-sm text-gray-500">{client.industry}</span>}
              {client.website && (
                <a href={client.website} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline truncate max-w-xs">
                  {client.website.replace(/https?:\/\//, "")}
                </a>
              )}
            </div>
          </div>
        </div>
        <Link
          href={`/reviews?clientId=${client.id}`}
          className="text-sm text-blue-600 hover:underline"
        >
          View all reviews →
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard title="Avg Rating" value={avgRating.toFixed(1)} icon={Star} color="yellow" suffix="/5" />
        <KpiCard title="Total Reviews" value={totalReviews} icon={MessageSquare} color="blue" />
        <KpiCard title="Pending Replies" value={pendingReplies} icon={Clock} color="orange" alert={pendingReplies > 0} />
        <KpiCard title="Reputation Score" value={reputationScore} icon={Shield} color="purple" suffix="/100" />
        <KpiCard title="Locations" value={client._count.locations} icon={MapPin} color="green" />
      </div>

      <Tabs defaultValue="locations">
        <TabsList>
          <TabsTrigger value="locations">Locations ({client._count.locations})</TabsTrigger>
          <TabsTrigger value="reviews">Recent Reviews</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns ({client._count.campaigns})</TabsTrigger>
        </TabsList>

        <TabsContent value="locations" className="mt-4 space-y-3">
          {client.locations.length === 0 ? (
            <div className="text-center py-10 text-gray-400">No locations added yet</div>
          ) : (
            client.locations.map((loc) => (
              <Card key={loc.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{loc.name}</p>
                      {loc.city && (
                        <p className="text-sm text-gray-500">{loc.city}, {loc.state}</p>
                      )}
                    </div>
                    <div className="flex gap-6 text-center">
                      {loc.googleBusinessProfiles.map((profile) => (
                        <div key={profile.id} className="text-center">
                          <div className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                            <span className="font-semibold text-gray-900">{profile.avgRating.toFixed(1)}</span>
                          </div>
                          <p className="text-xs text-gray-400">{profile.totalReviews} reviews</p>
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[120px]">{profile.locationName}</p>
                        </div>
                      ))}
                      {loc.googleBusinessProfiles.length === 0 && (
                        <span className="text-xs text-gray-400">No GBP connected</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="reviews" className="mt-4 space-y-3">
          {recentReviews.length === 0 ? (
            <div className="text-center py-10 text-gray-400">No reviews yet</div>
          ) : (
            recentReviews.map((review) => (
              <Card key={review.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900">
                          {review.reviewerName || "Anonymous"}
                        </span>
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`}
                            />
                          ))}
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs h-4 ${review.status === "PENDING" ? "text-orange-500 border-orange-200" : "text-green-600 border-green-200"}`}
                        >
                          {review.status}
                        </Badge>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{review.comment}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {review.profile.locationName} · {formatDate(review.publishedAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4 space-y-3">
          {campaigns.length === 0 ? (
            <div className="text-center py-10 text-gray-400">No campaigns yet</div>
          ) : (
            campaigns.map((camp) => (
              <Card key={camp.id} className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{camp.name}</p>
                    <p className="text-xs text-gray-500">{camp.type} · {formatDate(camp.createdAt)}</p>
                  </div>
                  <div className="flex gap-6 text-center">
                    <div><p className="font-semibold text-sm">{camp.totalSent}</p><p className="text-xs text-gray-400">Sent</p></div>
                    <div><p className="font-semibold text-sm">{camp.totalReviews}</p><p className="text-xs text-gray-400">Reviews</p></div>
                    <Badge className={`${camp.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"} border-0 text-xs`}>
                      {camp.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
