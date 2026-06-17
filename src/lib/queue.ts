import { Queue, Worker, QueueEvents } from "bullmq";
import Redis from "ioredis";

const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const QUEUES = {
  REVIEW_SYNC: "review-sync",
  REVIEW_ANALYSIS: "review-analysis",
  AI_RECOMMENDATIONS: "ai-recommendations",
  COMPETITOR_MONITOR: "competitor-monitor",
  CAMPAIGN_PROCESS: "campaign-process",
  NOTIFICATION: "notification",
  SOCIAL_PROOF: "social-proof",
} as const;

export const reviewSyncQueue = new Queue(QUEUES.REVIEW_SYNC, { connection });
export const reviewAnalysisQueue = new Queue(QUEUES.REVIEW_ANALYSIS, { connection });
export const aiRecommendationsQueue = new Queue(QUEUES.AI_RECOMMENDATIONS, { connection });
export const competitorMonitorQueue = new Queue(QUEUES.COMPETITOR_MONITOR, { connection });
export const campaignProcessQueue = new Queue(QUEUES.CAMPAIGN_PROCESS, { connection });
export const notificationQueue = new Queue(QUEUES.NOTIFICATION, { connection });
export const socialProofQueue = new Queue(QUEUES.SOCIAL_PROOF, { connection });

export async function addReviewSyncJob(data: {
  profileId: string;
  googleAccountId: string;
  agencyId: string;
  clientId: string;
}) {
  return reviewSyncQueue.add("sync-reviews", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  });
}

export async function addReviewAnalysisJob(data: {
  reviewId: string;
  reviewText: string;
  agencyId: string;
}) {
  return reviewAnalysisQueue.add("analyze-review", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  });
}

export async function addAiRecommendationsJob(data: {
  clientId: string;
  agencyId: string;
}) {
  return aiRecommendationsQueue.add("generate-recommendations", data, {
    attempts: 2,
    backoff: { type: "fixed", delay: 10000 },
  });
}

export async function scheduleRecurringJobs() {
  await reviewSyncQueue.add(
    "sync-all-reviews",
    { type: "all" },
    { repeat: { pattern: "0 */2 * * *" } }
  );

  await competitorMonitorQueue.add(
    "monitor-all-competitors",
    { type: "all" },
    { repeat: { pattern: "0 6 * * *" } }
  );

  await aiRecommendationsQueue.add(
    "generate-all-recommendations",
    { type: "all" },
    { repeat: { pattern: "0 8 * * 1" } }
  );
}
