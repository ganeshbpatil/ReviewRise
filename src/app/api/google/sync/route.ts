import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addReviewSyncJob } from "@/lib/queue";
import { z } from "zod";

const syncSchema = z.object({
  profileId: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const profile = await prisma.googleBusinessProfile.findFirst({
    where: { id: parsed.data.profileId, agencyId: session.user.agencyId },
  });

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const job = await addReviewSyncJob({
    profileId: profile.id,
    googleAccountId: profile.googleAccountId,
    agencyId: session.user.agencyId,
    clientId: profile.clientId,
  });

  return NextResponse.json({ data: { jobId: job.id, message: "Sync queued" } });
}
