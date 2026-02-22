import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Filter, AlertTriangle, Plus, Edit2, Trash2 } from "lucide-react";
import { menuCategories, MenuItem } from "@/data/mock-data";
import { useToast } from "@/components/ui/use-toast";
import { useInventory } from "@/hooks/useInventory";

export default function AdminInventoryPage() {
  const { items, addItem, editItem, deleteItem, updateStock, toggleSoldOut } = useInventory();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const { toast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [newItem, setNewItem] = useState<Partial<MenuItem>>({ name: "", price: 0, category: "ramyeon", description: "", stock: 0 });

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.price) return;
    const itemToAdd = {
      name: newItem.name || "",
      category: newItem.category || "ramyeon",
      price: Number(newItem.price) || 0,
      description: newItem.description || "",
      image: "/placeholder.svg",
      stock: Number(newItem.stock) || 0,
      isAvailable: true,
      spiceLevel: 0,
      tags: [],
      isSoldOut: (Number(newItem.stock) || 0) === 0
    };
    
    const result = await addItem(itemToAdd);
    if (result.success) {
      setIsAddModalOpen(false);
      setNewItem({ name: "", price: 0, category: "ramyeon", description: "", stock: 0 });
      toast({ title: "상품 추가됨", description: "새 상품이 목록에 추가되었습니다." });
    } else {
      toast({ title: "상품 추가 실패", description: result.error, variant: "destructive" });
    }
  };

  const handleEditItem = async () => {
    if (!editingItem) return;
    const result = await editItem(editingItem.id, editingItem);
    if (result.success) {
      setIsEditModalOpen(false);
      setEditingItem(null);
      toast({ title: "상품 수정됨", description: "상품 정보가 업데이트되었습니다." });
    } else {
      toast({ title: "상품 수정 실패", description: result.error, variant: "destructive" });
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (window.confirm("정말로 이 상품을 삭제하시겠습니까?")) {
      const result = await deleteItem(id);
      if (result.success) {
        toast({ title: "상품 삭제됨", description: "상품이 목록에서 삭제되었습니다.", variant: "destructive" });
      } else {
        toast({ title: "상품 삭제 실패", description: result.error, variant: "destructive" });
      }
    }
  };

  const handleStockChange = async (id: string, newStock: number) => {
    const result = await updateStock(id, newStock);
    if (result.success) {
      toast({ title: "재고 수정됨", description: "수량이 업데이트되었습니다." });
    } else {
      toast({ title: "재고 수정 실패", description: result.error, variant: "destructive" });
    }
  };

  const handleSoldOutToggle = async (id: string, isSoldOut: boolean) => {
    const result = await toggleSoldOut(id, isSoldOut);
    if (result.success) {
      toast({ title: isSoldOut ? "품절 처리됨" : "판매 재개됨", description: "상품 상태가 변경되었습니다." });
    } else {
      toast({ title: "상태 변경 실패", description: result.error, variant: "destructive" });
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 pb-20 sm:pb-0 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">재고 관리</h1>
          <p className="text-sm text-gray-500 mt-1">메뉴의 남은 수량을 실시간으로 관리하세요.</p>
        </div>
        
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-4 rounded-xl shadow-sm gap-2">
              <Plus className="w-5 h-5" /> 상품 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[90%] max-w-md bg-white border-gray-200 rounded-2xl p-5 shadow-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-gray-900">새 상품 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4 overflow-y-auto max-h-[80vh] px-1 scrollbar-hide">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500">상품명</Label>
                <Input value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="상품 이름을 입력하세요" className="rounded-xl border-gray-200 bg-gray-50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500">가격 (원)</Label>
                  <Input type="number" value={newItem.price || ''} onChange={e => setNewItem({...newItem, price: parseInt(e.target.value) || 0})} placeholder="0" className="rounded-xl border-gray-200 bg-gray-50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500">초기 재고</Label>
                  <Input type="number" value={newItem.stock || ''} onChange={e => setNewItem({...newItem, stock: parseInt(e.target.value) || 0})} placeholder="0" className="rounded-xl border-gray-200 bg-gray-50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500">카테고리</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newItem.category}
                  onChange={e => setNewItem({...newItem, category: e.target.value})}
                >
                  {menuCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500">설명</Label>
                <Textarea value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} placeholder="상품 설명을 입력하세요" className="resize-none h-20 rounded-xl border-gray-200 bg-gray-50" />
              </div>
              <Button onClick={handleAddItem} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl text-[15px] mt-2 shadow-sm">
                추가하기
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
         {/* Categories */}
         <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-hide">
            <button
               onClick={() => setActiveCategory("all")}
               className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${activeCategory === "all" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
               전체
            </button>
            {menuCategories.map(cat => (
               <button
                 key={cat.id}
                 onClick={() => setActiveCategory(cat.id)}
                 className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1 ${activeCategory === cat.id ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
               >
                 <span>{cat.icon}</span> {cat.name}
               </button>
            ))}
         </div>

         <div className="relative w-full sm:w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
             <Input 
                placeholder="메뉴명 검색..." 
                className="pl-9 bg-gray-50 border-gray-200"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
             />
         </div>
      </div>

      {/* Inventory List */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
         {filteredItems.map(item => {
           const isLowStock = item.stock > 0 && item.stock <= 10;
           
           return (
             <Card key={item.id} className={`overflow-hidden transition-all ${item.isSoldOut ? 'bg-gray-50 border-gray-200' : isLowStock ? 'border-red-200 bg-red-50/30' : 'bg-white border-gray-200'}`}>
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                   
                   <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                         <h3 className={`text-base font-bold truncate ${item.isSoldOut ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                           {item.name}
                         </h3>
                         {item.isSoldOut && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 border-0">품절</Badge>}
                         {isLowStock && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-300 text-red-600 bg-white"><AlertTriangle className="w-3 h-3 mr-1"/>품절 임박</Badge>}
                      </div>
                      <p className="text-xs text-gray-500">{item.price.toLocaleString()}원 · {menuCategories.find(c => c.id === item.category)?.name}</p>
                   </div>

                   <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end bg-gray-50 sm:bg-transparent p-3 sm:p-0 rounded-lg">
                      
                      {/* 수량 인풋 */}
                      <div className="flex items-center gap-2">
                         <span className="text-xs font-bold text-gray-500">현재 수량</span>
                         <Input 
                           type="number" 
                           value={item.stock} 
                           onChange={(e) => handleStockChange(item.id, parseInt(e.target.value) || 0)}
                           className="w-16 sm:w-20 text-center font-black text-blue-700 bg-white border-gray-300 h-9"
                           disabled={item.isSoldOut}
                         />
                      </div>

                      <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>

                      {/* 품절 토글 */}
                      <div className="flex items-center gap-2">
                         <span className={`text-xs font-bold hidden sm:inline ${item.isSoldOut ? 'text-red-600' : 'text-gray-500'}`}>
                           {item.isSoldOut ? '품절 해제' : '품절 처리'}
                         </span>
                         <Switch 
                           checked={item.isSoldOut}
                           onCheckedChange={(checked) => handleSoldOutToggle(item.id, checked)}
                           className="data-[state=checked]:bg-red-500"
                         />
                      </div>

                      <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>

                      {/* 액션 버튼 */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors" onClick={() => { setEditingItem(item); setIsEditModalOpen(true); }}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors" onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                   </div>
                </CardContent>
             </Card>
           )
         })}
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="w-[90%] max-w-md bg-white border-gray-200 rounded-2xl p-5 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900">상품 정보 수정</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 pt-4 overflow-y-auto max-h-[80vh] px-1 scrollbar-hide">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500">상품명</Label>
                <Input value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} placeholder="상품 이름을 입력하세요" className="rounded-xl border-gray-200 bg-gray-50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500">가격 (원)</Label>
                  <Input type="number" value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: parseInt(e.target.value) || 0})} placeholder="0" className="rounded-xl border-gray-200 bg-gray-50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500">현재 수량</Label>
                  <Input type="number" value={editingItem.stock} onChange={e => setEditingItem({...editingItem, stock: parseInt(e.target.value) || 0})} placeholder="0" className="rounded-xl border-gray-200 bg-gray-50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500">카테고리</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingItem.category}
                  onChange={e => setEditingItem({...editingItem, category: e.target.value})}
                >
                  {menuCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500">설명</Label>
                <Textarea value={editingItem.description} onChange={e => setEditingItem({...editingItem, description: e.target.value})} placeholder="상품 설명을 입력하세요" className="resize-none h-20 rounded-xl border-gray-200 bg-gray-50" />
              </div>
              <Button onClick={handleEditItem} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl text-[15px] mt-2 shadow-sm">
                저장하기
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
