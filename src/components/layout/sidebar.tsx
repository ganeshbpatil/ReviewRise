"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Star,
  Megaphone,
  TrendingUp,
  Share2,
  Brain,
  BarChart3,
  Settings,
  ChevronRight,
  Building2,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Clients",
    href: "/clients",
    icon: Users,
  },
  {
    label: "Reviews",
    href: "/reviews",
    icon: Star,
  },
  {
    label: "Campaigns",
    href: "/campaigns",
    icon: Megaphone,
  },
  {
    label: "Competitors",
    href: "/competitors",
    icon: TrendingUp,
  },
  {
    label: "Social Proof",
    href: "/social-proof",
    icon: Share2,
  },
  {
    label: "AI Assistant",
    href: "/ai-assistant",
    icon: Brain,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-900 flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Star className="h-5 w-5 text-white fill-white" />
        </div>
        <div>
          <span className="text-white font-bold text-sm leading-tight block">ReviewRise OS</span>
          <span className="text-slate-500 text-xs">Agency Platform</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  isActive ? "text-white" : "text-slate-500 group-hover:text-white"
                )}
              />
              {item.label}
              {isActive && <ChevronRight className="h-3 w-3 ml-auto text-blue-300" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-300 text-xs font-medium truncate">Agency Portal</p>
            <p className="text-slate-500 text-xs truncate">v2.0.0</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
