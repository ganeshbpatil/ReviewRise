import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const clientId = searchParams.get("clientId");
  const profileId = searchParams.get("profileId");
  const status = searchParams.get("status");
  const rating = searchParams.get("rating");
  const sentiment = searchParams.get("sentiment");
  const search = searchParams.get("search");

  const where: any = {
    agencyId: session.user.agencyId,
    ...(clientId && { clientId }),
    ...(profileId && { profileId }),
    ...(status && { status }),
    ...(rating && { rating: parseInt(rating) }),
    ...(sentiment && { sentiment }),
    ...(search && {
      OR: [
        { comment: { contains: search, mode: "insensitive" } },
        { reviewerName: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [reviews, total] = await Promise.all([
    prisma.googleReview.findMany({
      where,
      include: {
        reply: true,
        analysis: {
          select: { keywords: true, positiveSignals: true, negativeSignals: true, categories: true },
        },
        profile: {
          select: { locationName: true, avgRating: true, totalReviews: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { publishedAt: "desc" },
    }),
    prisma.googleReview.count({ where }),
  ]);

  return NextResponse.json({
    data: reviews,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
