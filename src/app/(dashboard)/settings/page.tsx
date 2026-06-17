"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Bell, Bot, Palette, Key } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Configure your agency platform settings</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4 text-purple-600" />
            AI Configuration
          </CardTitle>
          <CardDescription>Configure AI model settings for review responses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Reply Tone</Label>
            <Select defaultValue="professional">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="apologetic">Apologetic</SelectItem>
                <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-Reply to Positive Reviews</Label>
              <p className="text-xs text-gray-500 mt-0.5">Automatically reply to 4★+ reviews</p>
            </div>
            <Switch />
          </div>
          <div className="space-y-2">
            <Label>Anthropic API Key</Label>
            <Input type="password" placeholder="sk-ant-..." />
          </div>
          <div className="space-y-2">
            <Label>OpenAI API Key (optional)</Label>
            <Input type="password" placeholder="sk-..." />
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">Save AI Settings</Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-blue-600" />
            Notifications
          </CardTitle>
          <CardDescription>Choose what events trigger notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "New Review", desc: "Notify when a new review is received" },
            { label: "Negative Review", desc: "Alert for 1-2 star reviews" },
            { label: "Weekly Report", desc: "Send weekly reputation summary" },
            { label: "Monthly Report", desc: "Send monthly performance report" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <Label>{item.label}</Label>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
              <Switch defaultChecked />
            </div>
          ))}
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">Save Notifications</Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4 text-green-600" />
            Google Business Profile
          </CardTitle>
          <CardDescription>Connect Google accounts to sync reviews</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.href = "/api/google/auth"}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Connect Google Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
