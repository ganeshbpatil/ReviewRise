"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";

interface ReviewsChartProps {
  agencyId: string;
}

export function ReviewsChart({ agencyId }: ReviewsChartProps) {
  const { data } = useQuery({
    queryKey: ["reviews-chart", agencyId],
    queryFn: async () => {
      const res = await fetch("/api/analytics/chart");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data;
    },
    placeholderData: Array.from({ length: 30 }, (_, i) => ({
      date: format(subDays(new Date(), 29 - i), "MMM dd"),
      reviews: Math.floor(Math.random() * 15 + 2),
      avgRating: (Math.random() * 1.5 + 3.5).toFixed(1),
    })),
  });

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-gray-900">
          Review Volume — Last 30 Days
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="reviewsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#1E293B",
                border: "none",
                borderRadius: 8,
                color: "#F8FAFC",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="reviews"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#reviewsGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
