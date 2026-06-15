import { Worker } from "bullmq";
import Redis from "ioredis";
import { prisma } from "../lib/prisma";
import { analyzeReview, generateAiRecommendations } from "../lib/ai";
import { listReviews, getAuthClientWithTokens, normalizeGoogleReview } from "../lib/google-business";
import { QUEUES } from "../lib/queue";

const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

// Review Sync Worker
const reviewSyncWorker = new Worker(
  QUEUES.REVIEW_SYNC,
  async (job) => {
    const { profileId, googleAccountId, agencyId, clientId } = job.data;

    const account = await prisma.googleAccount.findUnique({
      where: { id: googleAccountId },
    });

    if (!account?.accessToken) {
      console.error(`No access token for account ${googleAccountId}`);
      return;
    }

    const authClient = await getAuthClientWithTokens(
      account.accessToken,
      account.refreshToken || undefined
    );

    const profile = await prisma.googleBusinessProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) return;

    const locationName = `accounts/${profile.accountId}/locations/${profileId}`;
    let pageToken: string | undefined;
    let syncedCount = 0;

    do {
      const { reviews, nextPageToken } = await listReviews(authClient, locationName, pageToken);
      pageToken = nextPageToken;

      for (const rawReview of reviews) {
        const normalized = normalizeGoogleReview(rawReview, profileId, agencyId, clientId);

        await prisma.googleReview.upsert({
          where: { googleReviewId: normalized.googleReviewId },
          create: normalized,
          update: {
            rating: normalized.rating,
            comment: normalized.comment,
            isOwnerReplied: normalized.isOwnerReplied,
            ownerReplyText: normalized.ownerReplyText,
            ownerReplyDate: normalized.ownerReplyDate,
          },
        });
        syncedCount++;
      }
    } while (pageToken);

    // Update profile stats
    const stats = await prisma.googleReview.aggregate({
      where: { profileId },
      _avg: { rating: true },
      _count: true,
    });

    await prisma.googleBusinessProfile.update({
      where: { id: profileId },
      data: {
        avgRating: stats._avg.rating ?? 0,
        totalReviews: stats._count,
        lastSyncedAt: new Date(),
      },
    });

    console.log(`Synced ${syncedCount} reviews for profile ${profileId}`);
  },
  { connection, concurrency: 5 }
);

// Review Analysis Worker
const reviewAnalysisWorker = new Worker(
  QUEUES.REVIEW_ANALYSIS,
  async (job) => {
    const { reviewId, reviewText, agencyId } = job.data;

    if (!reviewText || reviewText.length < 10) return;

    const settings = await prisma.agencySettings.findUnique({ where: { agencyId } });

    try {
      const analysis = await analyzeReview(reviewText, settings?.anthropicApiKey || undefined);

      await prisma.reviewAnalysis.upsert({
        where: { reviewId },
        create: {
          reviewId,
          sentiment: analysis.sentiment as any,
          sentimentScore: analysis.sentimentScore,
          keywords: analysis.keywords,
          topics: analysis.topics,
          staffMentions: analysis.staffMentions,
          serviceMentions: analysis.serviceMentions,
          positiveSignals: analysis.positiveSignals,
          negativeSignals: analysis.negativeSignals,
          categories: analysis.categories,
          isProcessed: true,
        },
        update: {
          sentiment: analysis.sentiment as any,
          sentimentScore: analysis.sentimentScore,
          keywords: analysis.keywords,
          topics: analysis.topics,
          positiveSignals: analysis.positiveSignals,
          negativeSignals: analysis.negativeSignals,
          categories: analysis.categories,
          isProcessed: true,
        },
      });

      await prisma.googleReview.update({
        where: { id: reviewId },
        data: {
          sentiment: analysis.sentiment as any,
          sentimentScore: analysis.sentimentScore,
        },
      });
    } catch (err) {
      console.error(`Failed to analyze review ${reviewId}:`, err);
      throw err;
    }
  },
  { connection, concurrency: 10 }
);

// AI Recommendations Worker
const aiRecommendationsWorker = new Worker(
  QUEUES.AI_RECOMMENDATIONS,
  async (job) => {
    const { clientId, agencyId } = job.data;

    const [client, reviewStats, pendingReplies, negativeReviews] = await Promise.all([
      prisma.client.findUnique({ where: { id: clientId } }),
      prisma.googleReview.aggregate({
        where: { clientId, agencyId },
        _avg: { rating: true },
        _count: true,
      }),
      prisma.googleReview.count({ where: { clientId, agencyId, status: "PENDING" } }),
      prisma.googleReview.count({ where: { clientId, agencyId, rating: { lte: 2 } } }),
    ]);

    if (!client) return;

    const settings = await prisma.agencySettings.findUnique({ where: { agencyId } });

    const recs = await generateAiRecommendations({
      businessName: client.name,
      avgRating: reviewStats._avg.rating ?? 0,
      totalReviews: reviewStats._count,
      pendingReplies,
      lastMonthReviews: 0,
      negativeReviews,
      apiKey: settings?.anthropicApiKey || undefined,
    });

    await prisma.$transaction(
      recs.map((rec) =>
        prisma.aiRecommendation.create({
          data: {
            agencyId,
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
  },
  { connection, concurrency: 3 }
);

// Error handling
[reviewSyncWorker, reviewAnalysisWorker, aiRecommendationsWorker].forEach((worker) => {
  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });
  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
  });
});

console.log("Workers started:", [QUEUES.REVIEW_SYNC, QUEUES.REVIEW_ANALYSIS, QUEUES.AI_RECOMMENDATIONS]);
