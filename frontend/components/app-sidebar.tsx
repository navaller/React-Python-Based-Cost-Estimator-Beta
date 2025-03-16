"use client";

import * as React from "react";
import { Bot, Settings2, SquareTerminal, Settings } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { AppTitleDisplay } from "@/components/app-title-display";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  company: {
    name: "Shubdin Industries",
    avatar: "",
    plan: "Cost Estimator App",
  },
  navMain: [
    {
      title: "Projects",
      url: "/Projects",
      icon: SquareTerminal,
      isActive: true,
    },
    {
      title: "Parts",
      url: "/Parts",
      icon: Bot,
    },
    {
      title: "Config",
      url: "/Config",
      icon: Settings2,
    },
    {
      title: "Settings",
      url: "/Settings",
      icon: Settings,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <AppTitleDisplay company={data.company} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter></SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
