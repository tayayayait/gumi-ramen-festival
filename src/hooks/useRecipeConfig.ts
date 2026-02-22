import { useState, useEffect } from "react";

const CONFIG_KEY = "ramen_go_recipe_config";

export interface RecipeConfig {
  soups: string[];
  toppings: string[];
}

const DEFAULT_CONFIG: RecipeConfig = {
  soups: ['쇠고기맛', '해물맛', '순한맛', '카레맛'],
  toppings: [
    '건파', '당근', '양파', '건청경채', '표고버섯',
    '콩단백', '김치후레이크', '건홍고추', '감자', '썰은미역',
    '오징어', '게맛살볼', '계란후레이크', '비프볼', '별미튀김',
    '치즈' // 추가 1종: 치즈
  ]
};

export function useRecipeConfig() {
  const [config, setConfig] = useState<RecipeConfig>(() => {
    // 1. localStorage에서 저장된 설정 가져오기
    try {
      const stored = localStorage.getItem(CONFIG_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to parse config from localStorage", e);
    }
    // 2. 없으면 기본값 반환
    return DEFAULT_CONFIG;
  });

  const saveConfig = (newConfig: RecipeConfig) => {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(newConfig));
      setConfig(newConfig);
    } catch (e) {
      console.error("Failed to save config to localStorage", e);
    }
  };

  const updateSoups = (soups: string[]) => {
    saveConfig({ ...config, soups });
  };

  const updateToppings = (toppings: string[]) => {
    saveConfig({ ...config, toppings });
  };

  const resetToDefault = () => {
    saveConfig(DEFAULT_CONFIG);
  };

  return {
    config,
    updateSoups,
    updateToppings,
    resetToDefault
  };
}
