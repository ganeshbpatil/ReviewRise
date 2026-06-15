"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Megaphone, Mail, MessageSquare, QrCode, TrendingUp, Play, Pause } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";

const typeIcons: Record<string, any> = {
  EMAIL: Mail,
  SMS: MessageSquare,
  WHATSAPP: MessageSquare,
  QR_CODE: QrCode,
  LINK: TrendingUp,
};

const statusColors: Record<string, string> = {
  DRAFT: "text-gray-500 bg-gray-100",
  ACTIVE: "text-green-600 bg-green-100",
  PAUSED: "text-yellow-600 bg-yellow-100",
  COMPLETED: "text-blue-600 bg-blue-100",
  ARCHIVED: "text-gray-400 bg-gray-50",
};

export default function CampaignsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/campaigns");
      return res.json();
    },
  });

  const campaigns = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Campaigns</h1>
          <p className="text-gray-500 text-sm mt-1">Drive more reviews from happy customers</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Active", value: campaigns.filter((c: any) => c.status === "ACTIVE").length, color: "text-green-600" },
          { label: "Total Sent", value: campaigns.reduce((s: number, c: any) => s + c.totalSent, 0), color: "text-blue-600" },
          { label: "Reviews Generated", value: campaigns.reduce((s: number, c: any) => s + c.totalReviews, 0), color: "text-purple-600" },
        ].map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16">
          <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No campaigns yet</p>
          <p className="text-gray-400 text-sm mt-1">Create your first campaign to start collecting reviews</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign: any) => {
            const Icon = typeIcons[campaign.type] || Mail;
            return (
              <Card key={campaign.id} className="border-0 shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 text-sm">{campaign.name}</h3>
                        <Badge className={cn("text-xs border-0", statusColors[campaign.status])}>
                          {campaign.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {campaign.client?.name} · {campaign.type}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{campaign.totalSent}</p>
                        <p className="text-xs text-gray-400">Sent</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{campaign.totalClicked}</p>
                        <p className="text-xs text-gray-400">Clicked</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{campaign.totalReviews}</p>
                        <p className="text-xs text-gray-400">Reviews</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {campaign.status === "ACTIVE" ? (
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <Pause className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600">
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      )}
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
