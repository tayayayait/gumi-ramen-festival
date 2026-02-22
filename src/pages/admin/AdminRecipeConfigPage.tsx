import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Plus, X, Save, RefreshCw } from "lucide-react";
import { useRecipeConfig } from "@/hooks/useRecipeConfig";
import { useToast } from "@/components/ui/use-toast";

export default function AdminRecipeConfigPage() {
  const { config, updateSoups, updateToppings, resetToDefault } = useRecipeConfig();
  const { toast } = useToast();
  
  // 로컬 상태 (저장 전 입력값)
  const [newSoup, setNewSoup] = useState("");
  const [newTopping, setNewTopping] = useState("");

  const handleAddSoup = () => {
    if (!newSoup.trim()) return;
    if (config.soups.includes(newSoup.trim())) {
      toast({ title: "이미 존재하는 스프입니다.", variant: "destructive" });
      return;
    }
    updateSoups([...config.soups, newSoup.trim()]);
    setNewSoup("");
    toast({ title: "스프 추가 완료" });
  };

  const handleRemoveSoup = (soup: string) => {
    updateSoups(config.soups.filter(s => s !== soup));
    toast({ title: "스프 삭제 완료" });
  };

  const handleAddTopping = () => {
    if (!newTopping.trim()) return;
    if (config.toppings.includes(newTopping.trim())) {
      toast({ title: "이미 존재하는 토핑입니다.", variant: "destructive" });
      return;
    }
    updateToppings([...config.toppings, newTopping.trim()]);
    setNewTopping("");
    toast({ title: "토핑 추가 완료" });
  };

  const handleRemoveTopping = (topping: string) => {
    updateToppings(config.toppings.filter(t => t !== topping));
    toast({ title: "토핑 삭제 완료" });
  };

  const handleReset = () => {
    if (confirm("정상 초깃값으로 되돌리시겠습니까?")) {
        resetToDefault();
        toast({ title: "기본값으로 초기화되었습니다." });
    }
  }

  return (
    <div className="space-y-6 pb-20 sm:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-blue-900 tracking-tight flex items-center gap-2">
            <ChefHat className="text-blue-600" /> AI 레시피 재료 설정
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            고객이 '나만의 라면' 생성 시 AI가 참고할 메뉴(스프, 토핑)를 관리합니다.
            <br/>이곳에서 메뉴를 변경하면 Gemini 추천에 실시간으로 반영됩니다.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset} className="flex items-center gap-2 font-bold bg-white text-gray-900 border-gray-300 hover:bg-gray-100 hover:text-gray-900">
            <RefreshCw className="w-4 h-4" /> 기본값 초기화
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 스프 설정 */}
        <Card className="shadow-sm flex flex-col bg-white border-gray-200">
          <CardHeader>
             <CardTitle className="text-lg font-bold border-b border-gray-200 pb-2 flex justify-between items-center text-gray-900">
                 스프 종류 <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">{config.soups.length}개</Badge>
             </CardTitle>
             <CardDescription className="text-gray-500 mt-1">AI가 이 중 **1가지**를 선택합니다.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col pt-4">
             <div className="flex gap-2 mb-4">
                 <Input 
                   placeholder="스프 이름 입력 (설렁탕맛, 마라맛 등)" 
                   value={newSoup} 
                   onChange={e => setNewSoup(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleAddSoup()}
                   className="flex-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                 />
                 <Button onClick={handleAddSoup} className="bg-accent-blue hover:bg-accent-neon text-white font-bold" size="icon">
                     <Plus className="w-5 h-5" />
                 </Button>
             </div>

             <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[300px] content-start flex-1 border border-gray-200 rounded-lg bg-gray-50 p-4">
                 {config.soups.map(soup => (
                     <Badge key={soup} variant="outline" className="px-3 py-1.5 text-sm bg-white text-gray-700 border-gray-300 font-medium flex items-center gap-1">
                         {soup}
                         <button onClick={() => handleRemoveSoup(soup)} className="ml-1 text-gray-400 hover:text-red-500 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500">
                             <X className="w-3 h-3" />
                         </button>
                     </Badge>
                 ))}
                 {config.soups.length === 0 && (
                     <div className="w-full text-center text-sm text-gray-500 py-10 font-medium">등록된 스프가 없습니다.</div>
                 )}
             </div>
          </CardContent>
        </Card>

        {/* 토핑 설정 */}
        <Card className="shadow-sm flex flex-col bg-white border-gray-200">
          <CardHeader>
             <CardTitle className="text-lg font-bold border-b border-gray-200 pb-2 flex justify-between items-center text-gray-900">
                 토핑 종류 <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">{config.toppings.length}개</Badge>
             </CardTitle>
             <CardDescription className="text-gray-500 mt-1">AI가 이 중 가장 어울리는 **4가지**를 선택합니다.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col pt-4">
          <div className="flex gap-2 mb-4">
                 <Input 
                   placeholder="토핑 이름 입력 (차슈, 미역, 떡 등)" 
                   value={newTopping} 
                   onChange={e => setNewTopping(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleAddTopping()}
                   className="flex-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                 />
                 <Button onClick={handleAddTopping} className="bg-accent-blue hover:bg-accent-neon text-white font-bold" size="icon">
                     <Plus className="w-5 h-5" />
                 </Button>
             </div>

             <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[300px] content-start flex-1 border border-gray-200 rounded-lg bg-gray-50 p-4">
                 {config.toppings.map(topping => (
                     <Badge key={topping} variant="outline" className="px-3 py-1.5 text-sm bg-white text-gray-700 border-gray-300 font-medium flex items-center gap-1">
                         {topping}
                         <button onClick={() => handleRemoveTopping(topping)} className="ml-1 text-gray-400 hover:text-red-500 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500">
                             <X className="w-3 h-3" />
                         </button>
                     </Badge>
                 ))}
                 {config.toppings.length === 0 && (
                     <div className="w-full text-center text-sm text-gray-500 py-10 font-medium">등록된 토핑이 없습니다.</div>
                 )}
             </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
