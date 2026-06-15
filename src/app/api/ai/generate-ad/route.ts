import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAdCopy } from "@/lib/ai";
import { z } from "zod";

const schema = z.object({
  reviewId: z.string(),
  platform: z.enum(["facebook", "google"]),
  saveToAccount: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const review = await prisma.googleReview.findFirst({
    where: { id: parsed.data.reviewId, agencyId: session.user.agencyId },
    include: { profile: { select: { locationName: true } } },
  });
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  const settings = await prisma.agencySettings.findUnique({
    where: { agencyId: session.user.agencyId },
  });

  const adCopy = await generateAdCopy({
    reviewText: review.comment || "Amazing experience!",
    reviewerName: review.reviewerName || "Happy Customer",
    businessName: review.profile.locationName,
    platform: parsed.data.platform,
    apiKey: settings?.anthropicApiKey || undefined,
  });

  // Save as ReviewAsset
  const asset = await prisma.reviewAsset.create({
    data: {
      reviewId: review.id,
      agencyId: session.user.agencyId,
      clientId: review.clientId,
      assetType: "AD_COPY",
      content: JSON.stringify(adCopy),
      status: "GENERATED",
      metadata: { platform: parsed.data.platform },
    },
  });

  // Optionally create ad record
  if (parsed.data.saveToAccount && parsed.data.platform === "facebook") {
    await prisma.facebookAd.create({
      data: {
        adAccountId: parsed.data.saveToAccount,
        agencyId: session.user.agencyId,
        clientId: review.clientId,
        reviewId: review.id,
        headline: adCopy.headlines?.[0],
        primaryText: (adCopy as any).primaryText,
        description: adCopy.descriptions?.[0],
        cta: (adCopy as any).cta,
        status: "draft",
      },
    });
  }

  return NextResponse.json({ data: { adCopy, assetId: asset.id } });
}
