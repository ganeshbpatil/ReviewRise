"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Sparkles, Send, ThumbsUp, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { cn, formatRelativeDate } from "@/lib/utils";

interface ReviewCardProps {
  review: {
    id: string;
    reviewerName: string | null;
    rating: number;
    comment: string | null;
    publishedAt: string;
    status: string;
    sentiment: string | null;
    isOwnerReplied: boolean;
    profile: { locationName: string; avgRating: number };
    reply: { replyText: string; isPublished: boolean } | null;
    analysis: {
      keywords: string[];
      positiveSignals: string[];
      negativeSignals: string[];
      categories: string[];
    } | null;
  };
}

const sentimentColors: Record<string, string> = {
  VERY_POSITIVE: "text-green-600 bg-green-50",
  POSITIVE: "text-green-500 bg-green-50",
  NEUTRAL: "text-gray-500 bg-gray-50",
  NEGATIVE: "text-red-500 bg-red-50",
  VERY_NEGATIVE: "text-red-600 bg-red-50",
};

export function ReviewCard({ review }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState(review.reply?.replyText || "");
  const [showReplyBox, setShowReplyBox] = useState(false);
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/reviews/reply", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: review.id }),
      });
      if (!res.ok) throw new Error("Failed to generate reply");
      return res.json();
    },
    onSuccess: (data) => {
      setReplyText(data.data.replyText);
      setShowReplyBox(true);
    },
  });

  const replyMutation = useMutation({
    mutationFn: async (publishToGoogle: boolean) => {
      const res = await fetch("/api/reviews/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: review.id, replyText, publishToGoogle }),
      });
      if (!res.ok) throw new Error("Failed to save reply");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      setShowReplyBox(false);
    },
  });

  return (
    <Card className={cn(
      "border-0 shadow-sm transition-all",
      review.rating <= 2 && "ring-1 ring-red-200",
      review.status === "PENDING" && "border-l-4 border-l-orange-400"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
            {(review.reviewerName || "A").charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <span className="font-medium text-gray-900 text-sm">
                  {review.reviewerName || "Anonymous"}
                </span>
                <span className="text-gray-400 text-xs ml-2">
                  · {review.profile.locationName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{formatRelativeDate(review.publishedAt)}</span>
                {review.sentiment && (
                  <Badge className={cn("text-xs h-5 border-0", sentimentColors[review.sentiment])}>
                    {review.sentiment.replace("_", " ")}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-3.5 w-3.5",
                      i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"
                    )}
                  />
                ))}
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs h-5",
                  review.status === "PENDING"
                    ? "text-orange-500 border-orange-200"
                    : "text-green-600 border-green-200"
                )}
              >
                {review.status === "PENDING" ? "Needs Reply" : review.status}
              </Badge>
            </div>

            {review.comment && (
              <p className={cn(
                "text-sm text-gray-700 mt-2 leading-relaxed",
                !expanded && "line-clamp-3"
              )}>
                {review.comment}
              </p>
            )}

            {review.comment && review.comment.length > 200 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-blue-500 hover:underline mt-1 flex items-center gap-1"
              >
                {expanded ? <><ChevronUp className="h-3 w-3" />Show less</> : <><ChevronDown className="h-3 w-3" />Read more</>}
              </button>
            )}

            {review.analysis && review.analysis.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {review.analysis.keywords.slice(0, 5).map((kw) => (
                  <Badge key={kw} variant="secondary" className="text-xs h-4 px-1.5">
                    {kw}
                  </Badge>
                ))}
              </div>
            )}

            {review.reply?.isPublished && !showReplyBox && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs font-medium text-blue-700 mb-1">Owner Reply</p>
                <p className="text-xs text-gray-700">{review.reply.replyText}</p>
              </div>
            )}

            {showReplyBox && (
              <div className="mt-3 space-y-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your reply..."
                  rows={3}
                  className="text-sm resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => replyMutation.mutate(true)}
                    disabled={replyMutation.isPending || !replyText.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Publish to Google
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => replyMutation.mutate(false)}
                    disabled={replyMutation.isPending}
                    className="text-xs"
                  >
                    Save Draft
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowReplyBox(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {!showReplyBox && (
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                >
                  <Sparkles className="h-3 w-3 mr-1 text-purple-500" />
                  {generateMutation.isPending ? "Generating..." : "AI Reply"}
                </Button>
                {!review.reply?.isPublished && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => setShowReplyBox(true)}
                  >
                    Write Reply
                  </Button>
                )}
                {review.rating <= 2 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 text-red-500"
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Flag
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
