import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

export function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(state?: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/business.manage",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    state,
    prompt: "consent",
  });
}

export async function exchangeCode(code: string) {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export async function getAuthClientWithTokens(accessToken: string, refreshToken?: string): Promise<OAuth2Client> {
  const client = createOAuthClient();
  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return client;
}

export async function listAccounts(authClient: OAuth2Client) {
  const mybusiness = google.mybusinessaccountmanagement({
    version: "v1",
    auth: authClient,
  });

  const response = await mybusiness.accounts.list();
  return response.data.accounts || [];
}

export async function listLocations(authClient: OAuth2Client, accountId: string) {
  const mybusiness = google.mybusinessbusinessinformation({
    version: "v1",
    auth: authClient,
  });

  const response = await mybusiness.accounts.locations.list({
    parent: accountId,
    readMask: "name,title,storefrontAddress,phoneNumbers,websiteUri,categories,regularHours,metadata,profile",
  });

  return response.data.locations || [];
}

export async function listReviews(
  authClient: OAuth2Client,
  locationName: string,
  pageToken?: string
): Promise<{ reviews: any[]; nextPageToken?: string }> {
  const mybusiness = google.mybusinessreviews({
    version: "v1",
    auth: authClient,
  });

  const response = await mybusiness.locations.reviews.list({
    parent: locationName,
    pageSize: 50,
    pageToken,
  });

  return {
    reviews: response.data.reviews || [],
    nextPageToken: response.data.nextPageToken,
  };
}

export async function replyToReview(
  authClient: OAuth2Client,
  reviewName: string,
  replyText: string
) {
  const mybusiness = google.mybusinessreviews({
    version: "v1",
    auth: authClient,
  });

  return mybusiness.locations.reviews.updateReply({
    name: reviewName,
    requestBody: { comment: replyText },
  });
}

export async function getLocationPerformance(
  authClient: OAuth2Client,
  locationName: string,
  startDate: { year: number; month: number; day: number },
  endDate: { year: number; month: number; day: number }
) {
  const mybusiness = google.mybusinessbusinessinformation({
    version: "v1",
    auth: authClient,
  });

  // GBP Insights v1 for metrics
  return { data: null }; // placeholder - actual impl depends on API availability
}

export function normalizeGoogleReview(raw: any, profileId: string, agencyId: string, clientId: string) {
  return {
    googleReviewId: raw.reviewId,
    profileId,
    agencyId,
    clientId,
    reviewerName: raw.reviewer?.displayName,
    reviewerPhotoUrl: raw.reviewer?.profilePhotoUrl,
    rating: ratingToNumber(raw.starRating),
    comment: raw.comment || null,
    publishedAt: new Date(raw.createTime),
    updatedAt: raw.updateTime ? new Date(raw.updateTime) : null,
    isOwnerReplied: !!raw.reviewReply,
    ownerReplyText: raw.reviewReply?.comment || null,
    ownerReplyDate: raw.reviewReply?.updateTime ? new Date(raw.reviewReply.updateTime) : null,
    status: "PENDING" as const,
  };
}

function ratingToNumber(rating: string): number {
  const map: Record<string, number> = {
    ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
  };
  return map[rating] || 0;
}
