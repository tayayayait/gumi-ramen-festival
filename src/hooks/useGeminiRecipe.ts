import { useState } from 'react';
import { GoogleGenAI } from '@google/genai';

// Hardcoded defaults removed, using config from localStorage

export interface RecipeResult {
  toppings: string[];
  soup: string;
  description: string;
}

export function useGeminiRecipe() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RecipeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // useRecipeConfig 훅을 이용해 현재 localStorage 값 읽기 (렌더링 시점에)
  const getConfig = () => {
    try {
        const stored = localStorage.getItem("ramen_go_recipe_config");
        if (stored) return JSON.parse(stored);
    } catch(e) {}
    return {
        soups: ['쇠고기맛', '해물맛', '순한맛', '카레맛'],
        toppings: ['건파', '당근', '양파', '건청경채', '표고버섯', '콩단백', '김치후레이크', '건홍고추', '감자', '썰은미역', '오징어', '게맛살볼', '계란후레이크', '비프볼', '별미튀김', '치즈']
    };
  }

  const generateRecipe = async (prompt: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // VITE_GEMINI_API_KEY 확인
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API 키가 설정되지 않았습니다.');
      }

      // Initialize GoogleGenAI
      const ai = new GoogleGenAI({ apiKey });

      const currentConfig = getConfig();

      // 시스템 프롬프트 구성 (JSON 형식 강제)
      const systemInstruction = `
당신은 미슐랭 3스타 레스토랑을 운영하는 세계 최고의 일류 요리사입니다. 당신만의 철학, 섬세한 미각, 그리고 라면 재료 간의 폭발적인 시너지를 바탕으로 완벽한 라면 한 그릇을 설계합니다.
고객의 요청(예: "스트레스 풀리는 미친 매운맛", "고객 접대용 고급 해장 라면")을 분석하여 아래 목록에서 최고의 궁합을 자랑하는 재료를 엄선해 주세요.

[사용 가능한 프리미엄 스프]: \${currentConfig.soups.join(', ')}
[엄선된 신선한 토핑]: \${currentConfig.toppings.join(', ')}

[미슐랭 셰프의 토핑 구성 원칙]
1. 시너지(Synergy): 국물의 기본 맛을 극대화하거나, 매운맛을 중화/감칠맛(Umami)을 올려주는 재료를 조합하세요. (예: 쇠고기맛+표고버섯=감칠맛 폭발)
2. 식감(Texture): 아삭함(파, 양파), 쫄깃함(오징어, 콩단백), 부드러움(계란, 미역) 등 대비되는 식감을 섞어 지루하지 않게 하세요.
3. 색감 및 향(Visual & Aroma): 시각적으로 입맛을 돋우는 색깔(파란 파, 붉은 홍고추, 당근)과 국물에 깊은 향을 더하는 재료를 고려하세요.

반드시 다음 조건을 지켜야 합니다:
1. 제공된 스프 목록에서 요리의 방향성을 결정할 1가지를 정확히 선택하세요.
2. 위 "토핑 구성 원칙"에 따라 제공된 토핑 목록 중에서 완벽한 밸런스를 갖춘 4가지를 정확히 선택하세요.
3. 요리사가 요리를 제공하며 설명하듯, 품격 있고 매력적인 어조로 추천하는 이유를 1~2문장으로 작성하세요. 이 때, 선택한 4가지 토핑이 어떻게 국물과 시너지를 내고 식감/향의 조화를 이루는지 구체적으로 언급해 주세요. (예: "매운맛 스프의 강렬함에 건홍고추의 알싸함과 표고버섯의 깊은 흙내음을 더해, 감칠맛을 극대화하고 씹는 맛까지 살린 스트레스를 단번에 우아하게 녹여낼 한 그릇을 준비했습니다.")
4. 응답은 무조건 올바른 구성의 순수 JSON 형식이어야 합니다. Markdown 형식(백틱 등)은 절대 사용하지 마세요.

응답 형식 예시:
{
  "toppings": ["표고버섯", "건파", "오징어", "김치후레이크"],
  "soup": "매운맛",
  "description": "다시마와 표고를 우려낸 듯한 깊은 감칠맛의 매운 스프에, 오징어의 바다 향과 튀긴 파의 기분 좋은 산뜻함을 더해 미각을 깨우는 한 그릇을 준비했습니다."
}`;

      // Gemini 모델 호출 (gemini-2.5-flash)
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            temperature: 0.7,
        }
      });

      const responseText = response.text;
      
      if (!responseText) {
          throw new Error("응답이 비어있습니다.");
      }

      try {
        const parsedData = JSON.parse(responseText);
        
        // 검증 로직 추가 (필요시)
        if (!parsedData.toppings || !parsedData.soup || !parsedData.description) {
            throw new Error("응답 형식이 올바르지 않습니다.");
        }

        const validToppings = parsedData.toppings.filter((t: string) => currentConfig.toppings.includes(t)).slice(0, 4);
        const validSoup = currentConfig.soups.includes(parsedData.soup) ? parsedData.soup : (currentConfig.soups[0] || '기본맛'); // 기본값 설정

        setResult({
            toppings: validToppings.length === 4 ? validToppings : [...validToppings, ...currentConfig.toppings.filter((t:string) => !validToppings.includes(t))].slice(0, 4), // 4개 맞추기 (선택 옵션)
            soup: validSoup,
            description: parsedData.description
        });
      } catch (parseError) {
          console.error("JSON 파싱 에러:", parseError, "원본 텍스트:", responseText);
          throw new Error("AI 응답을 분석하는 중 오류가 발생했습니다.");
      }

    } catch (err: any) {
      console.error('Gemini API Error:', err);
      setError(err.message || '레시피를 생성하는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generateRecipe,
    isLoading,
    result,
    error,
    resetResult: () => setResult(null)
  };
}
