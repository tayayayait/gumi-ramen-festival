import { useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation, Navigate, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  LogOut,
  ChefHat,
  ScanLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { adminSupabase } from "@/lib/supabase";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/components/ui/use-toast";

const navItems = [
  { title: "대시보드", href: "/admin", icon: LayoutDashboard },
  { title: "QR 스캔", href: "/admin/scanner", icon: ScanLine },
  { title: "주문 관리", href: "/admin/orders", icon: ShoppingBag },
  { title: "재고 관리", href: "/admin/inventory", icon: Package },
  { title: "AI 설정", href: "/admin/recipe-config", icon: ChefHat },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAdminAuth();
  const { isAdminLike, loading: isRoleLoading } = useUserRole({ scope: "admin" });
  const { toast } = useToast();
  const redirectedRef = useRef(false);

  useEffect(() => {
    redirectedRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    if (loading || isRoleLoading || !user || isAdminLike || redirectedRef.current) {
      return;
    }

    redirectedRef.current = true;
    void (async () => {
      await adminSupabase.auth.signOut();
      toast({
        title: "관리자 권한 필요",
        description: "관리자 또는 점주 계정으로 로그인해 주세요.",
        variant: "destructive",
      });
      navigate("/admin/login", { replace: true, state: { from: location } });
    })();
  }, [loading, isRoleLoading, user, isAdminLike, navigate, toast, location]);

  if (loading || isRoleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!isAdminLike) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
      <aside className="w-64 bg-white border-r border-border flex flex-col hidden sm:flex">
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
            <span className="bg-accent-blue text-white p-1 rounded-md text-sm">R_GO</span>
            상인 관리자
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all",
                  isActive
                    ? "bg-accent-blue/10 text-accent-blue"
                    : "text-muted-foreground hover:bg-black/5 hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5",
                    isActive ? "text-accent-blue" : "text-muted-foreground"
                  )}
                />
                {item.title}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 font-bold rounded-xl"
            onClick={async () => {
              await adminSupabase.auth.signOut();
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-background">
        <header className="sm:hidden flex items-center justify-between p-4 bg-white border-b border-border text-foreground">
          <h1 className="text-lg font-black tracking-tight">상인 관리자</h1>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </div>

        <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border flex py-2 px-4 justify-around z-50 pb-safe">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink key={item.href} to={item.href} className="flex flex-col items-center p-2">
                <item.icon
                  className={cn(
                    "w-6 h-6 mb-1",
                    isActive ? "text-accent-blue" : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-bold",
                    isActive ? "text-accent-blue" : "text-muted-foreground"
                  )}
                >
                  {item.title}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
