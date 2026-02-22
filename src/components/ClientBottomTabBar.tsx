import { NavLink, useLocation } from "react-router-dom";
import { Sparkles, Users, Store, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { title: "나만의 라면", path: "/", icon: Sparkles },
  { title: "스마트픽업", path: "/pickup", icon: Store },
  { title: "커뮤니티", path: "/community", icon: Users },
  { title: "마이페이지", path: "/mypage", icon: User },
];

export function ClientBottomTabBar() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex h-[64px] items-center justify-around border-t border-white/5 bg-primary-surface/80 backdrop-blur-xl safe-area-pb"
    >
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path || (tab.path !== "/" && location.pathname.startsWith(tab.path));
        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 min-h-[44px] min-w-[44px] text-xs font-medium transition-all duration-300 group px-2",
              isActive 
                ? "text-accent-blue scale-105" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {/* Active Indicator Glow */}
            {isActive && (
               <div className="absolute -top-[17px] left-1/2 -translate-x-1/2 w-8 h-1 bg-accent-blue rounded-full shadow-[0_0_10px_#00D4FF]" />
            )}
            
            <tab.icon
              className={cn(
                "h-6 w-6 transition-transform duration-300",
                isActive ? "drop-shadow-[0_0_8px_rgba(0,212,255,0.6)]" : "group-hover:scale-110"
              )}
            />
            <span className={cn("text-[10px]", isActive && "font-bold")}>{tab.title}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
