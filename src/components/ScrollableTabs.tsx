import React from "react";
import { SubNav, SubNavTab } from "./SubNav";

export type TabItem = SubNavTab;

interface ScrollableTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function ScrollableTabs({
  tabs,
  activeTab,
  onTabChange,
  className = "",
}: ScrollableTabsProps) {
  return (
    <SubNav
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      className={className}
    />
  );
}
