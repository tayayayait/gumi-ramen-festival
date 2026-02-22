import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface TimeSlot {
  id: string;
  shop_id: string;
  start_time: string;
  end_time: string;
  capacity: number;
  current_orders: number;
}

const REFRESH_INTERVAL_MS = 60_000;
const PICKUP_CONFIG_KEY = "pickup_config";

interface SlotConfig {
  operatingStartTime: string;
  operatingEndTime: string;
  slotDurationMinutes: number;
  slotCapacity: number;
}

const DEFAULT_SLOT_CONFIG: SlotConfig = {
  operatingStartTime: "11:00",
  operatingEndTime: "20:00",
  slotDurationMinutes: 15,
  slotCapacity: 30,
};

const loadSlotConfig = (): SlotConfig => {
  try {
    const stored = localStorage.getItem(PICKUP_CONFIG_KEY);
    if (stored) return { ...DEFAULT_SLOT_CONFIG, ...JSON.parse(stored) };
  } catch {
    // ignore
  }
  return DEFAULT_SLOT_CONFIG;
};

/**
 * SECURITY DEFINER RPC를 호출하여 오늘 시간 슬롯을 자동 생성.
 * RLS 우회를 위해 서버 측 함수 사용.
 */
const ensureTodaySlots = async (config: SlotConfig): Promise<void> => {
  try {
    const { data, error } = await supabase.rpc("ensure_today_time_slots", {
      p_operating_start: config.operatingStartTime,
      p_operating_end: config.operatingEndTime,
      p_slot_duration_minutes: config.slotDurationMinutes,
      p_slot_capacity: config.slotCapacity,
    });

    if (error) {
      console.warn("[useTimeSlots] RPC ensure_today_time_slots failed:", error.message);
      return;
    }

    console.log(`[useTimeSlots] ensure_today_time_slots returned: ${data} slots`);
  } catch (err) {
    console.warn("[useTimeSlots] RPC call failed:", err);
  }
};

export const useTimeSlots = (shopId?: string) => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTimeSlots = useCallback(
    async (background = false) => {
      if (!background) {
        setIsLoading(true);
      }

      try {
        setError(null);
        let resolvedShopId = shopId;
        const nowIso = new Date().toISOString();
        const shopResolutionErrors: string[] = [];

        if (!resolvedShopId) {
          const { data: firstShop, error: shopError } = await supabase
            .from("shops")
            .select("id")
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (shopError) {
            shopResolutionErrors.push(`Failed to load default shop: ${shopError.message}`);
          }

          resolvedShopId = firstShop?.id;
        }

        if (!resolvedShopId) {
          const { data: menuShop, error: menuError } = await supabase
            .from("menus")
            .select("shop_id")
            .limit(1)
            .maybeSingle();

          if (menuError) {
            shopResolutionErrors.push(`Failed to resolve shop from menus: ${menuError.message}`);
          }

          resolvedShopId = menuShop?.shop_id;
        }

        if (!resolvedShopId) {
          if (shopResolutionErrors.length > 0) {
            throw new Error(shopResolutionErrors.join(" / "));
          }

          setTimeSlots([]);
          setError(null);
          return;
        }

        // RPC로 오늘 슬롯 자동 생성 (없으면 생성, 있으면 skip)
        const config = loadSlotConfig();
        await ensureTodaySlots(config);

        const { data, error: slotsError } = await supabase
          .from("time_slots")
          .select("id, shop_id, start_time, end_time, capacity, current_orders")
          .eq("shop_id", resolvedShopId)
          .gt("end_time", nowIso)
          .order("start_time", { ascending: true });

        if (slotsError) {
          throw new Error(`Failed to load pickup slots: ${slotsError.message}`);
        }

        setTimeSlots(data ?? []);
      } catch (err) {
        setTimeSlots([]);
        setError(err instanceof Error ? err : new Error("Failed to load pickup slots."));
      } finally {
        if (!background) {
          setIsLoading(false);
        }
      }
    },
    [shopId]
  );

  useEffect(() => {
    void fetchTimeSlots();

    const interval = setInterval(() => {
      void fetchTimeSlots(true);
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchTimeSlots]);

  return { timeSlots, isLoading, error, refetch: () => fetchTimeSlots() };
};
