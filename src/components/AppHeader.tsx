import { useState, useEffect } from "react";
import { Bell, Menu, Search } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export function AppHeader({ onToggleSidebar }: AppHeaderProps) {
  const isMobile = useIsMobile();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const onScroll = () => setScrolled(main.scrollTop > 0);
    main.addEventListener("scroll", onScroll, { passive: true });
    return () => main.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        // 명세서: 모바일 56px, 데스크톱 64px
        "flex h-14 md:h-16 items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-4 md:px-6 shrink-0 transition-shadow duration-base ease-standard",
        scrolled && "shadow-sm",
      )}
      role="banner"
    >
      <div className="flex items-center gap-3">
        {isMobile && (
          <div className="flex items-center gap-2">
            <span className="text-lg">🍜</span>
            <span className="text-sm font-bold text-gradient-primary">
              원평 누들
            </span>
          </div>
        )}
        {!isMobile && (
          <button
            onClick={onToggleSidebar}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="사이드바 토글"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="검색"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Notifications */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="알림"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
          </span>
        </button>

        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-bold text-primary">
          관
        </div>
      </div>
    </header>
  );
}
