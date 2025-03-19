"use client";

import * as React from "react";
import {
  Bell,
  Menu,
  Settings,
  Ruler,
  Boxes,
  Shapes,
  FileCode,
  Wallet,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";

const data = {
  nav: [
    { name: "Units", icon: Ruler, url: "/Settings/Units" },
    { name: "Materials", icon: Boxes, url: "/Settings/Materials" },
    { name: "Operations", icon: FileCode, url: "/Settings/Operations" },
    {
      name: "Part Classification",
      icon: Shapes,
      url: "/Settings/Classification",
    },
    { name: "Costing", icon: Wallet, url: "/Settings/Costing" },
    { name: "Advanced", icon: Settings, url: "/Settings/Advanced" },
  ],
};

export function SettingsSidebar() {
  return (
    <Sidebar collapsible="none" className="hidden md:flex">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.nav.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.name === "Messages & media"}
                  >
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.name}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
