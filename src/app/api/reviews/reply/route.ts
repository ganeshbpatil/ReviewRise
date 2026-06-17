import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReviewReply } from "@/lib/ai";
import { replyToReview, getAuthClientWithTokens } from "@/lib/google-business";
import { z } from "zod";

const replySchema = z.object({
  reviewId: z.string(),
  replyText: z.string().min(1).max(4096),
  publishToGoogle: z.boolean().default(false),
});

const generateSchema = z.object({
  reviewId: z.string(),
  tone: z.enum(["professional", "friendly", "apologetic", "enthusiastic"]).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const review = await prisma.googleReview.findFirst({
    where: { id: parsed.data.reviewId, agencyId: session.user.agencyId },
    include: {
      profile: {
        include: {
          googleAccount: true,
        },
      },
    },
  });

  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  if (parsed.data.publishToGoogle && review.profile.googleAccount) {
    const { accessToken, refreshToken } = review.profile.googleAccount;
    if (accessToken) {
      const authClient = await getAuthClientWithTokens(accessToken, refreshToken || undefined);
      const reviewName = `accounts/${review.profile.accountId}/locations/${review.profileId}/reviews/${review.googleReviewId}`;
      await replyToReview(authClient, reviewName, parsed.data.replyText);
    }
  }

  const reply = await prisma.reviewReply.upsert({
    where: { reviewId: review.id },
    create: {
      reviewId: review.id,
      replyText: parsed.data.replyText,
      authorId: session.user.id,
      isPublished: parsed.data.publishToGoogle,
      publishedAt: parsed.data.publishToGoogle ? new Date() : null,
    },
    update: {
      replyText: parsed.data.replyText,
      authorId: session.user.id,
      isPublished: parsed.data.publishToGoogle,
      publishedAt: parsed.data.publishToGoogle ? new Date() : undefined,
    },
  });

  await prisma.googleReview.update({
    where: { id: review.id },
    data: {
      status: "REPLIED",
      isOwnerReplied: parsed.data.publishToGoogle,
      ownerReplyText: parsed.data.publishToGoogle ? parsed.data.replyText : undefined,
      ownerReplyDate: parsed.data.publishToGoogle ? new Date() : undefined,
    },
  });

  return NextResponse.json({ data: reply });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const review = await prisma.googleReview.findFirst({
    where: { id: parsed.data.reviewId, agencyId: session.user.agencyId },
    include: {
      profile: { select: { locationName: true } },
    },
  });

  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  const settings = await prisma.agencySettings.findUnique({
    where: { agencyId: session.user.agencyId },
  });

  const replyText = await generateReviewReply({
    reviewText: review.comment || "Great experience",
    rating: review.rating,
    businessName: review.profile.locationName,
    tone: parsed.data.tone || settings?.defaultReplyTone || "professional",
    apiKey: settings?.anthropicApiKey || undefined,
  });

  await prisma.aiAction.create({
    data: {
      agencyId: session.user.agencyId,
      clientId: review.clientId,
      userId: session.user.id,
      actionType: "review_reply",
      prompt: review.comment || "",
      response: replyText,
      model: "claude-haiku-4-5-20251001",
      status: "completed",
    },
  });

  return NextResponse.json({ data: { replyText } });
}
