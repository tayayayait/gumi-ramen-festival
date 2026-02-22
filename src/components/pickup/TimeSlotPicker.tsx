import { useTimeSlots, type TimeSlot } from "@/hooks/useTimeSlots";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

export { type TimeSlot };

export function TimeSlotPicker({ onSelect, selectedId, shopId }: { onSelect: (slot: TimeSlot & { text: string }) => void; selectedId?: string; shopId?: string }) {
  const { timeSlots, isLoading, error } = useTimeSlots(shopId);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 gap-2 border border-border rounded-xl">
        <Loader2 className="w-5 h-5 animate-spin text-accent-blue" />
        <span className="text-xs text-muted-foreground">시간표 로딩 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center rounded-xl bg-red-500/10 border border-red-500/20">
        <p className="text-xs font-bold text-red-500">시간표를 불러올 수 없습니다.</p>
      </div>
    );
  }

  if (timeSlots.length === 0) {
    return (
      <div className="p-4 text-center rounded-xl bg-black/5 border border-border">
        <p className="text-xs text-muted-foreground">현재 선택 가능한 픽업 시간이 없습니다.</p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">운영 시간이 종료되었거나 아직 오픈되지 않았습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mt-4 px-1">
      <h3 className="text-sm font-bold text-foreground mb-1">픽업 희망 시간 선택 (필수)</h3>
      <div className="grid grid-cols-2 gap-2">
        {timeSlots.map((slot) => {
          const isFull = slot.current_orders >= slot.capacity;
          const isSelected = slot.id === selectedId;
          const remaining = slot.capacity - slot.current_orders;
          const isAlmostFull = remaining <= 5 && remaining > 0;

          const text = `${format(new Date(slot.start_time), "HH:mm")} ~ ${format(new Date(slot.end_time), "HH:mm")}`;
          
          // 상태에 따른 스타일 결정
          const getStatusStyle = () => {
            if (isFull) return "bg-black/5 border-border opacity-50 cursor-not-allowed";
            if (isSelected) return "bg-accent-blue/10 border-accent-blue text-accent-blue shadow-glow-blue ring-2 ring-accent-blue/30";
            if (isAlmostFull) return "bg-orange-50 border-orange-200 text-foreground hover:bg-orange-100/80 hover:border-orange-300";
            return "bg-white border-border text-muted-foreground hover:bg-accent-blue/5 hover:border-accent-blue/30";
          };

          const getTextColor = () => {
            if (isFull) return "text-muted-foreground/50";
            if (isSelected) return "text-accent-blue";
            if (isAlmostFull) return "text-orange-700";
            return "text-foreground";
          };

          const getStatusLabel = () => {
            if (isFull) return { text: "마감", color: "text-red-400" };
            if (isAlmostFull) return { text: `마감 임박 ${remaining}건`, color: "text-orange-500" };
            return { text: `주문 가능 ${remaining}건`, color: isSelected ? "text-accent-blue/80" : "text-emerald-500" };
          };

          const status = getStatusLabel();

          return (
            <button
              key={slot.id}
              disabled={isFull}
              onClick={() => onSelect({ ...slot, text })}
              className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl border transition-all duration-200 ${getStatusStyle()}`}
            >
              <span className={`text-sm font-bold ${getTextColor()}`}>
                {text}
              </span>
              <span className={`text-[10px] mt-1 font-semibold ${status.color}`}>
                {status.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
