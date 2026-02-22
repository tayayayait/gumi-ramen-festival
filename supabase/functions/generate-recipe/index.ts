import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Google Gemini API 호출 엔드포인트
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

console.log("🚀 [generate-recipe] Edge Function Started!");

Deno.serve(async (req) => {
  // CORS 처리 (OPTIONS 요청 접근 허용)
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  try {
    // 1. 요청 바디에서 사용자 입력 데이터(기본 라면, 선택한 토핑들) 추출
    const { base_ramen, toppings, shop_id, user_id } = await req.json();

    if (!base_ramen || !toppings || toppings.length === 0) {
      throw new Error("Missing required parameters: base_ramen or toppings");
    }

    // 2. 환경 변수에서 구글 API 키 및 Supabase 키 가져오기
    const googleApiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY") || Deno.env.get("GOOGLE_MAPS_API_KEY");
    
    if (!googleApiKey) {
      throw new Error("Google API Key is not configured in Edge Function secrets.");
    }

    // 3. 모델에 전달할 프롬프트 구성
    const toppingListStr = toppings.join(', ');
    const prompt = `
      너는 '원평 누들-AI' 플랫폼의 마스터 셰프야.
      고객이 선택한 기본 라면은 [${base_ramen}]이고, 구미 지역 특산물을 포함한 추가 토핑은 [${toppingListStr}]야.
      
      이 재료들을 조합해서 MZ세대가 인스타그램에 자랑하고 싶을 만한 '창의적이고 이색적인 커스텀 라면 레시피'를 하나 만들어줘.
      
      반드시 아래 JSON 형식으로만 응답해 (추가적인 텍스트 설명 금지):
      {
        "recipe_name": "트렌디한 메뉴 이름",
        "ai_description": "메뉴에 대한 톡톡 튀는 2~3줄 설명",
        "cooking_steps": ["1단계...", "2단계...", "3단계..."]
      }
    `;

    // 4. Gemini API 호출
    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${googleApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
        }
      }),
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      console.error("Gemini API Error:", errorData);
      throw new Error("Failed to generate recipe from Gemini API");
    }

    const geminiData = await geminiResponse.json();
    
    // Gemini 응답에서 JSON 텍스트 추출 (JSON.parse 용이하도록)
    let generatedText = geminiData.candidates[0].content.parts[0].text;
    const parsedRecipe = JSON.parse(generatedText);

    // 5. 생성된 레시피를 Supabase custom_recipes 테이블에 자동 저장 (선택 사항)
    // 여기서 Supabase 관리자 권한 클라이언트를 생성합니다.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // RLS 우회하여 강제 주입
    );

    let dbRecordId = null;
    if (user_id) {
       const { data: insertData, error: dbError } = await supabaseAdmin
        .from('custom_recipes')
        .insert({
          creator_id: user_id,
          shop_id: shop_id || null,
          base_ramen: base_ramen,
          toppings: toppings,
          recipe_name: parsedRecipe.recipe_name,
          ai_description: parsedRecipe.ai_description
        })
        .select('id')
        .single();
        
      if (dbError) {
         console.warn("DB Insert warning (not fatal):", dbError.message);
      } else {
         dbRecordId = insertData.id;
      }
    }

    // 6. 클라이언트(프론트엔드/모바일)로 최종 결과 반환
    return new Response(
      JSON.stringify({ 
        success: true, 
        recipe: parsedRecipe,
        db_record_id: dbRecordId 
      }), 
      { 
        headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" 
        } 
      }
    );

  } catch (error) {
    console.error("Function Error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }), 
      { 
        status: 400, 
        headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        } 
      }
    );
  }
});
