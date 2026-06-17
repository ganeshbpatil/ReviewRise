import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAuthUrl } from "@/lib/google-business";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId") || "";

  const state = Buffer.from(
    JSON.stringify({ agencyId: session.user.agencyId, clientId, userId: session.user.id })
  ).toString("base64url");

  const url = getAuthUrl(state);
  return NextResponse.redirect(url);
}
