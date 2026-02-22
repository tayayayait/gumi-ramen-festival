import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { title: "대시보드", path: "/", icon: LayoutDashboard },
  { title: "메뉴", path: "/menu", icon: UtensilsCrossed },
  { title: "주문", path: "/orders", icon: ClipboardList },
  { title: "설정", path: "/settings", icon: Settings },
];

export function BottomTabBar() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-toast flex h-14 items-center justify-around border-t border-border bg-card/95 backdrop-blur-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      role="navigation"
      aria-label="하단 탭 바"
    >
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <tab.icon
              className={cn(
                "h-5 w-5",
                isActive &&
                  "drop-shadow-[0_0_6px_hsl(191,100%,50%)]",
              )}
            />
            <span>{tab.title}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
