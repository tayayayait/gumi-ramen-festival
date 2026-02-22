import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

// 환경변수에서 키를 읽어옵니다.
const apiKey =
  process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

if (!apiKey || apiKey.includes("YOUR_")) {
  console.error("❌ 오류: .env 파일에 올바른 구글 API 키를 입력해주세요!");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function run() {
  console.log("🚀 구미 원평 누들-AI 레시피 생성기 테스트 시작...\n");
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `너는 '원평 누들-AI'의 핵심 레시피 마스터야. 
구미 농심 공장의 '갓 튀긴 신라면'과 구미 지역 특산물(예: 구미한우, 장천 멜론 등)을 결합한 창의적이고 이색적인 라면 레시피 1개만 제안해줘.
MZ세대가 인스타그램에 올리고 싶을 만한 트렌디한 메뉴 이름과, 간단한 3줄 요리법을 포함해줘.`,
    });

    console.log("======================================");
    console.log("🍜 [Gemini 응답 결과]");
    console.log("======================================");
    console.log(response.text);
    console.log("======================================\n");
    console.log(
      "✅ 테스트 성공! 이 프롬프트를 나중에 Supabase Edge Function에 이식할 예정입니다.",
    );
  } catch (err) {
    console.error("❌ API 호출 에러:", err.message);
    if (err.message.includes("API_KEY_INVALID")) {
      console.error(
        "👉 [해결 방법] API 키가 유효하지 않거나, Google Cloud Console에서 'Generative Language API'가 활성화되지 않았습니다. AI Studio(aistudio.google.com)에서 발급받은 키를 사용하는 것을 권장합니다.",
      );
    }
  }
}

run();
