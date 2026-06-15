import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "30");
  const clientId = searchParams.get("clientId");

  const agencyId = session.user.agencyId;
  const dates = Array.from({ length: days }, (_, i) => subDays(new Date(), days - 1 - i));

  const data = await Promise.all(
    dates.map(async (date) => {
      const [reviews, avgRating] = await Promise.all([
        prisma.googleReview.count({
          where: {
            agencyId,
            ...(clientId && { clientId }),
            publishedAt: { gte: startOfDay(date), lte: endOfDay(date) },
          },
        }),
        prisma.googleReview.aggregate({
          where: {
            agencyId,
            ...(clientId && { clientId }),
            publishedAt: { gte: startOfDay(date), lte: endOfDay(date) },
          },
          _avg: { rating: true },
        }),
      ]);

      return {
        date: format(date, "MMM dd"),
        reviews,
        avgRating: Number((avgRating._avg.rating || 0).toFixed(1)),
      };
    })
  );

  return NextResponse.json({ data });
}
