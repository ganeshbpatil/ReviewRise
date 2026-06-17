import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ReviewFilters {
  clientId?: string;
  profileId?: string;
  rating?: string;
  status?: string;
  sentiment?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useReviews(filters: ReviewFilters = {}) {
  return useQuery({
    queryKey: ["reviews", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== "" && v !== "all") params.set(k, String(v));
      });
      const res = await fetch(`/api/reviews?${params}`);
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
  });
}

export function useGenerateReply() {
  return useMutation({
    mutationFn: async ({ reviewId, tone }: { reviewId: string; tone?: string }) => {
      const res = await fetch("/api/reviews/reply", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, tone }),
      });
      if (!res.ok) throw new Error("Failed to generate reply");
      return res.json();
    },
  });
}

export function usePublishReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reviewId,
      replyText,
      publishToGoogle,
    }: {
      reviewId: string;
      replyText: string;
      publishToGoogle: boolean;
    }) => {
      const res = await fetch("/api/reviews/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, replyText, publishToGoogle }),
      });
      if (!res.ok) throw new Error("Failed to save reply");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reviews"] }),
  });
}

export function useReviewStats(agencyId?: string) {
  return useQuery({
    queryKey: ["review-stats", agencyId],
    queryFn: async () => {
      const res = await fetch("/api/analytics");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });
}
