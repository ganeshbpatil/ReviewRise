"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Globe, ArrowRight } from "lucide-react";
import { cn, formatRating } from "@/lib/utils";

interface ClientCardProps {
  client: {
    id: string;
    name: string;
    logoUrl: string | null;
    website: string | null;
    industry: string | null;
    isActive: boolean;
    _count: { locations: number };
    locations: Array<{
      googleBusinessProfiles: Array<{
        avgRating: number;
        totalReviews: number;
      }>;
    }>;
  };
}

export function ClientCard({ client }: ClientCardProps) {
  const allProfiles = client.locations.flatMap((l) => l.googleBusinessProfiles);
  const avgRating = allProfiles.length > 0
    ? allProfiles.reduce((sum, p) => sum + p.avgRating, 0) / allProfiles.length
    : 0;
  const totalReviews = allProfiles.reduce((sum, p) => sum + p.totalReviews, 0);

  return (
    <Link href={`/clients/${client.id}`}>
      <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {client.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{client.name}</h3>
                {client.industry && (
                  <p className="text-xs text-gray-500">{client.industry}</p>
                )}
              </div>
            </div>
            <Badge
              variant={client.isActive ? "default" : "secondary"}
              className={cn(
                "text-xs",
                client.isActive ? "bg-green-100 text-green-700 border-0" : ""
              )}
            >
              {client.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                <span className="text-base font-bold text-gray-900">
                  {avgRating > 0 ? formatRating(avgRating) : "—"}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Avg Rating</p>
            </div>
            <div className="text-center">
              <span className="text-base font-bold text-gray-900">{totalReviews}</span>
              <p className="text-xs text-gray-400 mt-0.5">Reviews</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-base font-bold text-gray-900">{client._count.locations}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Locations</p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            {client.website ? (
              <div className="flex items-center gap-1 text-xs text-gray-400 truncate">
                <Globe className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{client.website.replace(/https?:\/\//, "")}</span>
              </div>
            ) : (
              <span className="text-xs text-gray-300">No website</span>
            )}
            <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
