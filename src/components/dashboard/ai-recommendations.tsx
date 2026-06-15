"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Zap, TrendingUp, MessageSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  impactScore: number;
  estimatedResult: string | null;
}

const categoryIcons: Record<string, React.ComponentType<any>> = {
  review_response: MessageSquare,
  profile_optimization: Settings,
  campaign: Zap,
  content: Brain,
  competitive: TrendingUp,
};

const priorityColors: Record<string, string> = {
  high: "text-red-600 bg-red-50 border-red-200",
  medium: "text-yellow-600 bg-yellow-50 border-yellow-200",
  low: "text-green-600 bg-green-50 border-green-200",
};

export function AiRecommendations({ recommendations }: { recommendations: Recommendation[] }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-600" />
          AI Recommendations
        </CardTitle>
        <Link href="/ai-assistant" className="text-xs text-blue-600 hover:underline">View all</Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No recommendations yet</p>
        )}
        {recommendations.map((rec) => {
          const Icon = categoryIcons[rec.category] || Brain;
          return (
            <div key={rec.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-800 leading-tight">{rec.title}</p>
                  <Badge
                    variant="outline"
                    className={cn("text-xs h-5 flex-shrink-0", priorityColors[rec.priority])}
                  >
                    {rec.priority}
                  </Badge>
                </div>
                {rec.estimatedResult && (
                  <p className="text-xs text-gray-500 mt-0.5">{rec.estimatedResult}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${(rec.impactScore / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{rec.impactScore}/10</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
