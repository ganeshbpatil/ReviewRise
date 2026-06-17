"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, Star, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CompetitorsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["competitors"],
    queryFn: async () => {
      const res = await fetch("/api/competitors");
      return res.json();
    },
  });

  const competitors = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Competitor Tracking</h1>
          <p className="text-gray-500 text-sm mt-1">Monitor competitor ratings and reviews</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Competitor
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : competitors.length === 0 ? (
        <div className="text-center py-16">
          <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No competitors tracked yet</p>
          <p className="text-gray-400 text-sm mt-1">Add competitors to benchmark your reputation</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {competitors.map((comp: any) => {
            const snapshots = comp.snapshots || [];
            const prev = snapshots[1];
            const curr = snapshots[0];
            const ratingDiff = prev && curr ? curr.avgRating - prev.avgRating : 0;

            return (
              <Card key={comp.id} className="border-0 shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{comp.name}</h3>
                      {comp.city && (
                        <p className="text-xs text-gray-500 mt-0.5">{comp.city}, {comp.state}</p>
                      )}
                    </div>
                    {comp.category && (
                      <Badge variant="secondary" className="text-xs">{comp.category}</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-xl font-bold text-gray-900">
                          {comp.avgRating.toFixed(1)}
                        </span>
                        {ratingDiff !== 0 && (
                          <span className={cn(
                            "text-xs font-medium flex items-center",
                            ratingDiff > 0 ? "text-red-500" : "text-green-600"
                          )}>
                            {ratingDiff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {Math.abs(ratingDiff).toFixed(1)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">Rating</p>
                    </div>
                    <div>
                      <span className="text-xl font-bold text-gray-900">{comp.totalReviews}</span>
                      <p className="text-xs text-gray-400">Reviews</p>
                    </div>
                  </div>

                  {comp.googleMapsUrl && (
                    <a
                      href={comp.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline mt-3 block"
                    >
                      View on Google Maps →
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
