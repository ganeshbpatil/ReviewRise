import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addReviewAnalysisJob } from "@/lib/queue";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["PENDING", "REPLIED", "FLAGGED", "ARCHIVED"]).optional(),
  isCurated: z.boolean().optional(),
  isHighlighted: z.boolean().optional(),
  curatedReason: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const review = await prisma.googleReview.findFirst({
    where: { id: params.id, agencyId: session.user.agencyId },
    include: {
      reply: true,
      analysis: true,
      assets: true,
      profile: {
        select: { locationName: true, avgRating: true, totalReviews: true },
      },
    },
  });

  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: review });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const review = await prisma.googleReview.findFirst({
    where: { id: params.id, agencyId: session.user.agencyId },
  });
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.googleReview.update({
    where: { id: params.id },
    data: parsed.data,
  });

  // Trigger analysis if not done yet
  if (!review.sentiment && review.comment) {
    await addReviewAnalysisJob({
      reviewId: review.id,
      reviewText: review.comment,
      agencyId: session.user.agencyId,
    });
  }

  return NextResponse.json({ data: updated });
}
