"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, CheckCircle, Clock, Zap, MessageSquare, Settings, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const categoryIcons: Record<string, any> = {
  review_response: MessageSquare,
  profile_optimization: Settings,
  campaign: Zap,
  content: Brain,
  competitive: TrendingUp,
};

const priorityConfig: Record<string, { color: string; label: string }> = {
  high: { color: "bg-red-100 text-red-700 border-red-200", label: "High Priority" },
  medium: { color: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "Medium" },
  low: { color: "bg-green-100 text-green-700 border-green-200", label: "Low" },
};

export default function AiAssistantPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["ai-recommendations"],
    queryFn: async () => {
      const res = await fetch("/api/ai/recommendations");
      return res.json();
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ai/recommendations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-recommendations"] }),
  });

  const recommendations = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-600" />
            AI Growth Assistant
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Personalized recommendations to grow your reputation
          </p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white">
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Recommendations
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Recommendations", value: recommendations.length, icon: Brain, color: "text-purple-600 bg-purple-50" },
          { label: "High Priority", value: recommendations.filter((r: any) => r.priority === "high").length, icon: Zap, color: "text-red-600 bg-red-50" },
          { label: "Avg Impact Score", value: recommendations.length > 0 ? (recommendations.reduce((s: number, r: any) => s + r.impactScore, 0) / recommendations.length).toFixed(1) : "0", icon: TrendingUp, color: "text-green-600 bg-green-50" },
        ].map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.color.split(" ")[1])}>
                <stat.icon className={cn("h-5 w-5", stat.color.split(" ")[0])} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <div className="text-center py-16">
          <Brain className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No recommendations yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Click "Generate Recommendations" to get AI-powered growth suggestions
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec: any) => {
            const Icon = categoryIcons[rec.category] || Brain;
            const priority = priorityConfig[rec.priority] || priorityConfig.medium;
            return (
              <Card key={rec.id} className="border-0 shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-purple-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" className={cn("text-xs", priority.color)}>
                            {priority.label}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            Impact: {rec.impactScore}/10
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                      {rec.estimatedResult && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                          <span className="text-xs text-green-600 font-medium">{rec.estimatedResult}</span>
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs flex-shrink-0"
                      onClick={() => completeMutation.mutate(rec.id)}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      Done
                    </Button>
                  </div>

                  <div className="mt-3 ml-14">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${(rec.impactScore / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-12 text-right">
                        {rec.impactScore}/10
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
