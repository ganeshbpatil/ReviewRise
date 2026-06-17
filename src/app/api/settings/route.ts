import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { z } from "zod";

const updateSchema = z.object({
  defaultReplyTone: z.string().optional(),
  autoReplyEnabled: z.boolean().optional(),
  autoReplyThreshold: z.number().min(1).max(5).optional(),
  notifyOnNegative: z.boolean().optional(),
  notifyOnAllReviews: z.boolean().optional(),
  weeklyReportEnabled: z.boolean().optional(),
  monthlyReportEnabled: z.boolean().optional(),
  brandPrimaryColor: z.string().optional(),
  anthropicApiKey: z.string().optional(),
  openaiApiKey: z.string().optional(),
  googleApiKey: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.agencySettings.findUnique({
    where: { agencyId: session.user.agencyId },
  });

  // Mask API keys in response
  const masked = settings ? {
    ...settings,
    anthropicApiKey: settings.anthropicApiKey ? "sk-ant-****" : null,
    openaiApiKey: settings.openaiApiKey ? "sk-****" : null,
    googleApiKey: settings.googleApiKey ? "AIza****" : null,
  } : null;

  return NextResponse.json({ data: masked });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasPermission(session.user.role, "settings:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const settings = await prisma.agencySettings.upsert({
    where: { agencyId: session.user.agencyId },
    create: { agencyId: session.user.agencyId, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json({ data: { message: "Settings saved" } });
}
