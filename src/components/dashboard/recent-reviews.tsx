"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, CheckCircle, Clock } from "lucide-react";
import { formatRelativeDate, cn } from "@/lib/utils";
import Link from "next/link";

interface Review {
  id: string;
  reviewerName: string | null;
  rating: number;
  comment: string | null;
  publishedAt: Date;
  status: string;
  profile: { locationName: string };
  reply: { isPublished: boolean } | null;
}

export function RecentReviews({ reviews }: { reviews: Review[] }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-gray-900">Recent Reviews</CardTitle>
        <Link href="/reviews" className="text-xs text-blue-600 hover:underline">View all</Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {reviews.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No reviews yet</p>
        )}
        {reviews.map((review) => (
          <div key={review.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs">
                {(review.reviewerName || "A").charAt(0)}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-800 truncate">
                  {review.reviewerName || "Anonymous"}
                </span>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {formatRelativeDate(review.publishedAt)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-3 w-3",
                        i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-500">{review.profile.locationName}</span>
              </div>
              {review.comment && (
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{review.comment}</p>
              )}
              <div className="mt-1.5">
                {review.reply?.isPublished ? (
                  <Badge variant="outline" className="text-xs h-5 text-green-600 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Replied
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs h-5 text-orange-500 border-orange-200">
                    <Clock className="h-3 w-3 mr-1" />
                    Needs Reply
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
