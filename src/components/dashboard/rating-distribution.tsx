"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingDistributionProps {
  data: Array<{ rating: number; _count: number }>;
}

export function RatingDistribution({ data }: RatingDistributionProps) {
  const total = data.reduce((sum, d) => sum + d._count, 0);

  const rows = [5, 4, 3, 2, 1].map((rating) => {
    const found = data.find((d) => d.rating === rating);
    const count = found?._count || 0;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return { rating, count, pct };
  });

  const colorMap: Record<number, string> = {
    5: "bg-green-500",
    4: "bg-green-400",
    3: "bg-yellow-400",
    2: "bg-orange-400",
    1: "bg-red-500",
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-gray-900">
          Rating Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map(({ rating, count, pct }) => (
          <div key={rating} className="flex items-center gap-3">
            <div className="flex items-center gap-1 w-12 flex-shrink-0">
              <span className="text-sm font-medium text-gray-700">{rating}</span>
              <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
            </div>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", colorMap[rating])}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
          </div>
        ))}
        <p className="text-xs text-gray-400 text-center mt-2">{total} total reviews</p>
      </CardContent>
    </Card>
  );
}
