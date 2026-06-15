import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addReviewAnalysisJob } from "@/lib/queue";
import { z } from "zod";

const schema = z.object({
  reviewId: z.string().optional(),
  clientId: z.string().optional(),
  all: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { reviewId, clientId, all } = parsed.data;

  if (reviewId) {
    const review = await prisma.googleReview.findFirst({
      where: { id: reviewId, agencyId: session.user.agencyId },
    });
    if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (review.comment) {
      await addReviewAnalysisJob({ reviewId: review.id, reviewText: review.comment, agencyId: session.user.agencyId });
    }
    return NextResponse.json({ data: { queued: 1 } });
  }

  if (all || clientId) {
    const reviews = await prisma.googleReview.findMany({
      where: {
        agencyId: session.user.agencyId,
        ...(clientId && { clientId }),
        sentiment: null,
        comment: { not: null },
      },
      select: { id: true, comment: true },
      take: 100,
    });

    for (const review of reviews) {
      if (review.comment) {
        await addReviewAnalysisJob({
          reviewId: review.id,
          reviewText: review.comment,
          agencyId: session.user.agencyId,
        });
      }
    }

    return NextResponse.json({ data: { queued: reviews.length } });
  }

  return NextResponse.json({ error: "Specify reviewId, clientId, or all=true" }, { status: 400 });
}
