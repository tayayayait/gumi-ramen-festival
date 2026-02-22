import { useState, useCallback } from "react";

export interface PickupConfig {
  operatingStartTime: string; // "11:00"
  operatingEndTime: string;   // "16:00"
  slotDurationMinutes: number; // 15
  slotCapacity: number;        // 30
  minLeadTimeMinutes: number;  // 15 (현재 시각 기준 최소 준비 시간)
}

const STORAGE_KEY = "pickup_config";

const DEFAULT_CONFIG: PickupConfig = {
  operatingStartTime: "11:00",
  operatingEndTime: "20:00",
  slotDurationMinutes: 15,
  slotCapacity: 30,
  minLeadTimeMinutes: 15,
};

const loadConfig = (): PickupConfig => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_CONFIG;
};

export const usePickupConfig = () => {
  const [config, setConfigState] = useState<PickupConfig>(loadConfig);

  const updateConfig = useCallback((partial: Partial<PickupConfig>) => {
    setConfigState((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetConfig = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setConfigState(DEFAULT_CONFIG);
  }, []);

  return { config, updateConfig, resetConfig, DEFAULT_CONFIG };
};
