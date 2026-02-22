import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Crown, TrendingUp } from "lucide-react";
import { mockShops } from "@/data/mock-data"; 

export interface RankItem {
  id: string;
  name: string;
  score: number;
}

export function RankingBoard() {
  const [rankings, setRankings] = useState<RankItem[]>([]);

  useEffect(() => {
    // 실 데이터가 없으므로 임시로 mockShops 의 대기 인원수를 판매량으로 가장하여 랭킹 화
    // MVP 용이므로 setInterval로 약간의 변동을 시뮬레이션
    const updateRankings = () => {
      const sorted = [...mockShops]
        .map(shop => ({
            id: shop.id,
            name: shop.name + " 대표메뉴",
            score: shop.current_wait_count * 10 + Math.floor(Math.random() * 50) 
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      setRankings(sorted);
    };

    updateRankings();
    const interval = setInterval(updateRankings, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full relative overflow-hidden rounded-3xl p-[1px] mb-6">
      {/* Outer animated gradient border */}
      <div className="absolute inset-0 bg-gradient-to-r from-accent-blue via-transparent to-accent-orange opacity-40 animate-[spin_4s_linear_infinite]" />
      
      {/* Inner Glass Container */}
      <div className="relative h-full w-full bg-black/40 backdrop-blur-2xl rounded-3xl p-5 border border-white/10 shadow-[0_8px_32px_0_rgba(0,180,216,0.15)] flex flex-col gap-4">
        
        {/* Background glow effects */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-accent-blue/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-accent-orange/20 rounded-full blur-3xl pointer-events-none" />

        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <TrendingUp className="w-20 h-20 text-accent-blue" />
        </div>
        
        {/* Header */}
        <div className="flex items-center gap-2 relative z-10 border-b border-white/5 pb-2">
          <Crown className="w-5 h-5 text-yellow-400 animate-pulse drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
          <h2 className="text-base font-black text-white tracking-widest bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">실시간 BEST 라면</h2>
          <span className="text-[10px] font-bold text-accent-blue/90 bg-accent-blue/10 px-2 py-0.5 rounded-full ml-auto border border-accent-blue/20">LIVE</span>
        </div>

        {/* List */}
        <div className="flex flex-col gap-3 relative z-10 w-full mt-1">
          {rankings.map((item, index) => (
            <div key={item.id} className="group flex items-center gap-4 bg-white/5 rounded-2xl p-3 backdrop-blur-md border border-white/10 transition-all hover:bg-white/10 hover:border-white/20 hover:shadow-glow-blue w-full overflow-hidden relative">
              
              {/* Internal subtle gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-accent-blue/0 via-accent-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

              {/* Rank Badge */}
              <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-sm font-black z-10 ${index === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-600 text-black shadow-[0_0_15px_rgba(250,204,21,0.6)]' : index === 1 ? 'bg-gradient-to-br from-gray-200 to-gray-400 text-black shadow-lg' : index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-lg' : 'bg-white/10 text-white border border-white/20'}`}>
                {index + 1}
              </div>
              
              <div className="flex-1 min-w-0 z-10">
                <span className="text-sm font-bold text-white block truncate">{item.name}</span>
                {index === 0 && <span className="text-[10px] text-accent-blue font-bold">압도적 인기! 예약률 급상승</span>}
              </div>
              
              <Badge variant="outline" className="shrink-0 z-10 text-[11px] font-black border-accent-orange text-accent-orange bg-accent-orange/10 px-2 py-1">
                {item.score} 🔥
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
