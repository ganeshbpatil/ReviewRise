import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeCode, getAuthClientWithTokens, listAccounts, listLocations } from "@/lib/google-business";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(new URL("/settings?error=google_auth_failed", req.url));
  }

  let stateData: { agencyId: string; clientId: string; userId: string };
  try {
    stateData = JSON.parse(Buffer.from(state, "base64url").toString());
  } catch {
    return NextResponse.redirect(new URL("/settings?error=invalid_state", req.url));
  }

  const tokens = await exchangeCode(code);
  if (!tokens.access_token) {
    return NextResponse.redirect(new URL("/settings?error=no_token", req.url));
  }

  // Get Google user info
  const authClient = await getAuthClientWithTokens(tokens.access_token, tokens.refresh_token || undefined);
  const oauth2 = google.oauth2({ version: "v2", auth: authClient });
  const { data: userInfo } = await oauth2.userinfo.get();

  const account = await prisma.googleAccount.upsert({
    where: {
      clientId_googleAccountId: {
        clientId: stateData.clientId,
        googleAccountId: userInfo.id!,
      },
    },
    create: {
      agencyId: stateData.agencyId,
      clientId: stateData.clientId,
      googleAccountId: userInfo.id!,
      email: userInfo.email!,
      name: userInfo.name,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scopes: (tokens.scope || "").split(" "),
      isActive: true,
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      isActive: true,
    },
  });

  // Fetch and store locations
  try {
    const accounts = await listAccounts(authClient);
    for (const gbpAccount of accounts) {
      if (!gbpAccount.name) continue;
      const locations = await listLocations(authClient, gbpAccount.name);
      for (const loc of locations) {
        if (!loc.name) continue;
        const locationId = loc.name.split("/").pop()!;
        await prisma.googleBusinessProfile.upsert({
          where: { id: locationId },
          create: {
            id: locationId,
            agencyId: stateData.agencyId,
            clientId: stateData.clientId,
            googleAccountId: account.id,
            accountId: gbpAccount.name,
            locationName: loc.title || "Unnamed Location",
            storeName: loc.title,
            address: (loc.storefrontAddress as any)?.addressLines?.join(", "),
            city: (loc.storefrontAddress as any)?.locality,
            state: (loc.storefrontAddress as any)?.administrativeArea,
            postalCode: (loc.storefrontAddress as any)?.postalCode,
            country: (loc.storefrontAddress as any)?.regionCode,
            website: loc.websiteUri,
          },
          update: {
            locationName: loc.title || "Unnamed Location",
            website: loc.websiteUri,
          },
        });
      }
    }
  } catch (e) {
    console.error("Failed to fetch GBP locations:", e);
  }

  return NextResponse.redirect(new URL(`/clients/${stateData.clientId}?connected=true`, req.url));
}
