"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Share2, Instagram, Facebook, Linkedin, FileText, Film, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const assetTypeIcons: Record<string, any> = {
  INSTAGRAM_POST: Instagram,
  FACEBOOK_POST: Facebook,
  LINKEDIN_POST: Linkedin,
  TESTIMONIAL: FileText,
  REEL_SCRIPT: Film,
  AD_COPY: Zap,
};

const statusColors: Record<string, string> = {
  PENDING: "text-gray-500 bg-gray-100",
  GENERATED: "text-blue-600 bg-blue-100",
  APPROVED: "text-green-600 bg-green-100",
  REJECTED: "text-red-500 bg-red-100",
  PUBLISHED: "text-purple-600 bg-purple-100",
};

export default function SocialProofPage() {
  const [assetType, setAssetType] = useState("all");
  const [status, setStatus] = useState("all");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["social-proof", assetType, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(assetType !== "all" && { assetType }),
        ...(status !== "all" && { status }),
      });
      const res = await fetch(`/api/social-proof?${params}`);
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ assetId, status }: { assetId: string; status: string }) => {
      const res = await fetch("/api/social-proof", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, status }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["social-proof"] }),
  });

  const assets = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Social Proof Engine</h1>
          <p className="text-gray-500 text-sm mt-1">Convert reviews into social media content</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Select value={assetType} onValueChange={setAssetType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Asset Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="INSTAGRAM_POST">Instagram Post</SelectItem>
            <SelectItem value="FACEBOOK_POST">Facebook Post</SelectItem>
            <SelectItem value="LINKEDIN_POST">LinkedIn Post</SelectItem>
            <SelectItem value="TESTIMONIAL">Testimonial</SelectItem>
            <SelectItem value="REEL_SCRIPT">Reel Script</SelectItem>
            <SelectItem value="AD_COPY">Ad Copy</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="GENERATED">Generated</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-16">
          <Share2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No social proof assets yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Generate content from reviews in the Reviews page
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((asset: any) => {
            const Icon = assetTypeIcons[asset.assetType] || FileText;
            return (
              <Card key={asset.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Icon className="h-3.5 w-3.5 text-purple-600" />
                      </div>
                      <span className="text-xs font-medium text-gray-700">
                        {asset.assetType.replace(/_/g, " ")}
                      </span>
                    </div>
                    <Badge className={cn("text-xs border-0", statusColors[asset.status])}>
                      {asset.status}
                    </Badge>
                  </div>

                  {asset.review && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-400">
                        From: {asset.review.reviewerName || "Anonymous"} · {asset.review.rating}★
                      </p>
                    </div>
                  )}

                  <p className="text-sm text-gray-700 line-clamp-5 bg-gray-50 rounded-lg p-3 text-xs leading-relaxed">
                    {asset.content}
                  </p>

                  {asset.status === "GENERATED" && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => approveMutation.mutate({ assetId: asset.id, status: "APPROVED" })}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs text-red-500 border-red-200"
                        onClick={() => approveMutation.mutate({ assetId: asset.id, status: "REJECTED" })}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </div>
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
