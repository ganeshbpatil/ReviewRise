import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  website: z.string().url().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  industry: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

async function getClientOrFail(id: string, agencyId: string) {
  const client = await prisma.client.findFirst({
    where: { id, agencyId },
  });
  return client;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await prisma.client.findFirst({
    where: { id: params.id, agencyId: session.user.agencyId },
    include: {
      locations: {
        include: {
          googleBusinessProfiles: {
            select: { id: true, locationName: true, avgRating: true, totalReviews: true },
          },
        },
      },
      _count: {
        select: {
          locations: true,
          campaigns: true,
          competitors: true,
        },
      },
    },
  });

  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ data: client });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasPermission(session.user.role, "client:update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const client = await getClientOrFail(params.id, session.user.agencyId);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.client.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasPermission(session.user.role, "client:delete")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const client = await getClientOrFail(params.id, session.user.agencyId);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.client.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  return NextResponse.json({ message: "Client deactivated" });
}
