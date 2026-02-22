import { Outlet } from "react-router-dom";
import { ClientBottomTabBar } from "@/components/ClientBottomTabBar";

export default function ClientLayout() {
  return (
    <div className="min-h-screen w-full md:bg-border text-foreground font-sans selection:bg-accent-blue/30 flex justify-center">
      {/* Mobile container - fluid on mobile, centered max-w-md on desktop */}
      <div className="flex min-h-[100dvh] w-full md:max-w-md flex-col bg-background md:shadow-xl overflow-hidden relative md:border-x border-border">
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden safe-area-pt pb-safe relative scrollbar-hide">
            {/* Bright Mode Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden max-w-md mx-auto">
                <div className="absolute top-[-5%] left-[-10%] w-[50%] h-[30%] bg-accent-blue/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-5%] right-[-10%] w-[50%] h-[30%] bg-accent-orange/5 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 min-h-full">
                <Outlet />
            </div>
        </main>

        {/* Bottom Navigation */}
        <div className="w-full md:max-w-md mx-auto fixed bottom-0 left-0 right-0 z-50">
            <ClientBottomTabBar />
        </div>
      </div>
    </div>
  );
}
