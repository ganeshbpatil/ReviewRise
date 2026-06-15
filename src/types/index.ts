import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: UserRole;
      agencyId: string;
      clientId?: string | null;
      locationId?: string | null;
    };
  }
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardKPIs {
  totalClients: number;
  totalLocations: number;
  totalReviews: number;
  avgRating: number;
  pendingReplies: number;
  reputationScore: number;
  reviewsThisMonth: number;
  reviewsLastMonth: number;
  ratingChange: number;
}

export interface ReviewWithAnalysis {
  id: string;
  googleReviewId: string;
  profileId: string;
  reviewerName: string | null;
  rating: number;
  comment: string | null;
  publishedAt: Date;
  status: string;
  sentiment: string | null;
  sentimentScore: number | null;
  isOwnerReplied: boolean;
  isCurated: boolean;
  reply?: { replyText: string; isPublished: boolean } | null;
  analysis?: {
    keywords: string[];
    positiveSignals: string[];
    negativeSignals: string[];
    categories: string[];
  } | null;
  profile: {
    locationName: string;
    avgRating: number;
  };
}
