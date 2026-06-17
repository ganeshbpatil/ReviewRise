import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSocialProof } from "@/lib/ai";
import { z } from "zod";

const generateSchema = z.object({
  reviewId: z.string(),
  assetType: z.enum([
    "INSTAGRAM_POST", "FACEBOOK_POST", "LINKEDIN_POST",
    "TESTIMONIAL", "LANDING_PAGE", "CAROUSEL",
    "REEL_SCRIPT", "VIDEO_SCRIPT", "AD_COPY",
  ]),
  collectionId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const assetType = searchParams.get("assetType");
  const status = searchParams.get("status");

  const assets = await prisma.reviewAsset.findMany({
    where: {
      agencyId: session.user.agencyId,
      ...(clientId && { clientId }),
      ...(assetType && { assetType: assetType as any }),
      ...(status && { status: status as any }),
    },
    include: {
      review: {
        select: { reviewerName: true, rating: true, comment: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ data: assets });
}

export async function POST(req: NextRequest) {
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

  const content = await generateSocialProof({
    reviewText: review.comment || "Amazing experience!",
    reviewerName: review.reviewerName || "Customer",
    rating: review.rating,
    businessName: review.profile.locationName,
    assetType: parsed.data.assetType,
    apiKey: settings?.anthropicApiKey || undefined,
  });

  const asset = await prisma.reviewAsset.create({
    data: {
      reviewId: review.id,
      agencyId: session.user.agencyId,
      clientId: review.clientId,
      collectionId: parsed.data.collectionId,
      assetType: parsed.data.assetType,
      content,
      status: "GENERATED",
    },
  });

  return NextResponse.json({ data: asset });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { assetId, status } = body;

  const asset = await prisma.reviewAsset.findFirst({
    where: { id: assetId, agencyId: session.user.agencyId },
  });

  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  const updated = await prisma.reviewAsset.update({
    where: { id: assetId },
    data: {
      status,
      ...(status === "APPROVED" && {
        approvedBy: session.user.id,
        approvedAt: new Date(),
      }),
    },
  });

  return NextResponse.json({ data: updated });
}
