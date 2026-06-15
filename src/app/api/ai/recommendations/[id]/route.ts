import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["pending", "completed", "dismissed"]),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const rec = await prisma.aiRecommendation.findFirst({
    where: { id: params.id, agencyId: session.user.agencyId },
  });
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.aiRecommendation.update({
    where: { id: params.id },
    data: {
      status: parsed.data.status,
      ...(parsed.data.status === "completed" && { completedAt: new Date() }),
    },
  });

  return NextResponse.json({ data: updated });
}
