import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGeminiRecipe, RecipeResult } from "@/hooks/useGeminiRecipe";

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const { generateRecipe, isLoading, result, error, resetResult } = useGeminiRecipe();
  const bottomRef = useRef<HTMLDivElement>(null);

  // 자동 스크롤
  useEffect(() => {
    if (result || isLoading || error) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [result, isLoading, error]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    
    // 이전 결과 초기화 후 새 요청
    resetResult();
    generateRecipe(prompt);
    setPrompt("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-background text-foreground overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 p-fluid-sm border-b border-border bg-white/70 backdrop-blur-xl sticky top-0 z-10 w-full shadow-xs safe-area-pt">
            <Sparkles className="w-5 h-5 text-accent-blue" />
            <h1 className="text-fluid-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-accent-neon tracking-tight py-1">
                라면 AI 메이트
            </h1>
        </div>

        {/* 대화 및 결과 영역 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* 웰컴 메시지 - AI */}
            <div className="flex gap-3 max-w-[85%]">
                <div className="w-9 h-9 rounded-full bg-accent-blue/10 flex items-center justify-center shrink-0 border border-border">
                    <Bot className="w-5 h-5 text-accent-blue" />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm p-fluid-sm border border-border shadow-sm">
                    <p className="text-fluid-base leading-relaxed text-gray-800">
                        안녕하세요! 완벽한 라면 한 그릇을 선사할 AI 요리사입니다. 👨‍🍳<br/>오늘 어떤 맛을 원하시나요?
                    </p>
                    <div className="mt-3 flex flex-col gap-1.5">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">이런 식으로 물어보세요 ✨</span>
                        <div className="text-fluid-sm text-accent-blue bg-accent-blue/5 p-2 rounded-lg border border-accent-blue/10 font-medium">"비오는 날 어울리는 해물 라면 추천해줘"</div>
                        <div className="text-fluid-sm text-accent-orange bg-accent-orange/5 p-2 rounded-lg border border-accent-orange/10 font-medium">"매운거 못 먹는데 스트레스 풀리는 맛"</div>
                    </div>
                </div>
            </div>

            {/* 사용자 질문 */}
            {prompt && (isLoading || result || error) && (
                 <div className="flex gap-3 max-w-[85%] ml-auto justify-end">
                    <div className="bg-accent-blue text-white rounded-2xl rounded-tr-sm p-fluid-sm shadow-sm">
                        <p className="text-fluid-base leading-relaxed font-medium">{prompt}</p>
                    </div>
                 </div>
            )}

            {/* 로딩 표시 - AI */}
            {isLoading && (
                 <div className="flex gap-3 max-w-[85%]">
                     <div className="w-9 h-9 rounded-full bg-accent-blue/10 flex items-center justify-center shrink-0 border border-border">
                        <Bot className="w-5 h-5 text-accent-blue" />
                    </div>
                     <div className="bg-white rounded-2xl p-4 border border-border shadow-sm flex items-center gap-2">
                         <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-accent-blue rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-accent-blue/70 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-accent-blue/40 rounded-full animate-bounce"></div>
                         </div>
                         <span className="text-sm text-muted-foreground font-medium ml-2">최고의 레시피를 조합하는 중...</span>
                     </div>
                 </div>
            )}

            {/* 에러 메시지 - AI */}
            {error && !isLoading && (
                 <div className="flex gap-3 max-w-[85%]">
                     <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                        <Bot className="w-5 h-5 text-red-500" />
                    </div>
                     <div className="bg-red-50 rounded-2xl rounded-tl-sm p-4 border border-red-100 shadow-sm">
                         <p className="text-[15px] text-red-600 font-medium">{error}</p>
                     </div>
                 </div>
            )}

            {/* 레시피 결과 - AI */}
            {result && !isLoading && (
                 <div className="flex gap-3 max-w-[95%]">
                    <div className="w-9 h-9 rounded-full bg-accent-blue/10 flex items-center justify-center shrink-0 border border-border">
                        <Bot className="w-5 h-5 text-accent-blue" />
                    </div>
                    
                    <div className="bg-white rounded-2xl rounded-tl-sm p-fluid-md border border-border shadow-md flex-1 min-w-0">
                        <div className="mb-fluid-sm">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-orange/15 border border-accent-orange/20 text-accent-orange text-xs font-black mb-3">
                                <Sparkles className="w-3.5 h-3.5" />
                                {result.soup}
                            </div>
                            <p className="text-fluid-base font-medium leading-relaxed bg-primary-surface/50 p-fluid-sm rounded-xl border border-border text-gray-800 tracking-tight">
                                "{result.description}"
                            </p>
                        </div>
                        
                        <div className="bg-primary-surface/30 p-4 rounded-xl border border-border/50">
                            <p className="text-[11px] text-muted-foreground mb-3 font-bold uppercase tracking-widest flex items-center gap-1">
                                추천 조리법 토핑
                            </p>
                            <div className="grid grid-cols-2 gap-2.5">
                                {result.toppings.map((topping, idx) => (
                                    <div key={idx} className="bg-white border border-border rounded-xl p-3 flex items-center justify-center text-center shadow-xs transition-transform hover:-translate-y-0.5">
                                        <span className="text-sm font-bold text-gray-700">{topping}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                 </div>
            )}
            
            <div ref={bottomRef} className="h-4" />
        </div>

        {/* 고정 입력 영역 (SNS Style) */}
        <div className="p-fluid-sm bg-white/80 backdrop-blur-xl border-t border-border pb-safe pt-3">
            <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-md mx-auto relative">
                <Input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="매운 새우 라면 어때요?"
                    disabled={isLoading}
                    className="flex-1 bg-white border-border text-foreground placeholder:text-muted-foreground/70 rounded-full h-14 pl-5 pr-16 focus-visible:ring-accent-blue focus-visible:border-accent-blue shadow-xs font-medium text-fluid-base"
                />
                <Button 
                    type="submit" 
                    disabled={isLoading || !prompt.trim()}
                    className="absolute right-1 top-1 bottom-1 w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-accent-blue hover:bg-accent-neon text-white border-none shrink-0 disabled:bg-gray-200 disabled:text-gray-400 p-0"
                    size="icon"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
            </form>
        </div>
    </div>
  );
}
