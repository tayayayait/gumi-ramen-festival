import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface ShopWaitlist {
  shop_id: string;
  current_wait_count: number;
}

/**
 * 특정 매장 또는 전체 매장의 실시간 대기 인원(`current_wait_count`)을 구독하는 훅.
 */
export const useRealtimeWaitlist = (shopId?: string) => {
  const [waitCounts, setWaitCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    // 1. 초기 데이터 불러오기 (MVP 용)
    const fetchInitialData = async () => {
      let query = supabase.from("shops").select("id, current_wait_count");
      if (shopId) {
        query = query.eq("id", shopId);
      }
      const { data, error } = await query;
      if (error) {
        console.warn("[useRealtimeWaitlist] 초기 데이터 로딩 실패 (DB 스키마 미적용 가능성):", error.message);
        return;
      }
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((shop: any) => {
          counts[shop.id] = shop.current_wait_count ?? 0;
        });
        setWaitCounts(counts);
      }
    };

    fetchInitialData();

    // 2. Realtime 구독 설정
    // shops 테이블에서 UPDATE 발생 시 캡처 (Row Level Security 적용 여부에 따라 동작 결정)
    const channel = supabase
      .channel("shops-waitlist")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "shops",
          filter: shopId ? `id=eq.${shopId}` : undefined,
        },
        (payload) => {
          const updatedShop = payload.new as any;
          setWaitCounts((prev) => ({
            ...prev,
            [updatedShop.id]: updatedShop.current_wait_count,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId]);

  return waitCounts;
};
