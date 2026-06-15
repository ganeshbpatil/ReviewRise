import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: "blue" | "green" | "yellow" | "purple" | "orange" | "teal" | "red";
  suffix?: string;
  trend?: number;
  alert?: boolean;
}

const colorMap = {
  blue:   { bg: "bg-blue-50",   icon: "text-blue-600",   ring: "bg-blue-100" },
  green:  { bg: "bg-green-50",  icon: "text-green-600",  ring: "bg-green-100" },
  yellow: { bg: "bg-yellow-50", icon: "text-yellow-600", ring: "bg-yellow-100" },
  purple: { bg: "bg-purple-50", icon: "text-purple-600", ring: "bg-purple-100" },
  orange: { bg: "bg-orange-50", icon: "text-orange-600", ring: "bg-orange-100" },
  teal:   { bg: "bg-teal-50",   icon: "text-teal-600",   ring: "bg-teal-100" },
  red:    { bg: "bg-red-50",    icon: "text-red-600",    ring: "bg-red-100" },
};

export function KpiCard({ title, value, icon: Icon, color, suffix, trend, alert }: KpiCardProps) {
  const colors = colorMap[color];

  return (
    <Card className={cn("border-0 shadow-sm", alert && "ring-2 ring-orange-300")}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-gray-900">{value}</span>
              {suffix && <span className="text-sm text-gray-500">{suffix}</span>}
            </div>
            {trend !== undefined && (
              <div className={cn(
                "flex items-center gap-1 mt-1 text-xs font-medium",
                trend >= 0 ? "text-green-600" : "text-red-500"
              )}>
                {trend >= 0
                  ? <TrendingUp className="h-3 w-3" />
                  : <TrendingDown className="h-3 w-3" />
                }
                {Math.abs(trend)}% vs last month
              </div>
            )}
          </div>
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors.ring)}>
            <Icon className={cn("h-5 w-5", colors.icon)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
