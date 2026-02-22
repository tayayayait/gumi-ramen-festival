import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { usePickupConfig } from "@/hooks/usePickupConfig";
import { useToast } from "@/components/ui/use-toast";
import { Clock, Users, Timer, RotateCcw, Save } from "lucide-react";

export default function AdminPickupConfigPage() {
  const { config, updateConfig, resetConfig, DEFAULT_CONFIG } = usePickupConfig();
  const { toast } = useToast();

  const [localConfig, setLocalConfig] = useState(config);

  const handleSave = () => {
    updateConfig(localConfig);
    toast({
      title: "설정 저장 완료 ✅",
      description: "픽업 시간 설정이 즉시 반영됩니다.",
    });
  };

  const handleReset = () => {
    resetConfig();
    setLocalConfig(DEFAULT_CONFIG);
    toast({
      title: "기본값 복원",
      description: "모든 설정이 기본값으로 초기화되었습니다.",
    });
  };

  const configFields = [
    {
      key: "operatingStartTime" as const,
      label: "운영 시작 시간",
      icon: <Clock className="w-5 h-5 text-accent-blue" />,
      type: "time",
      hint: "축제/매장이 오픈하는 시간",
    },
    {
      key: "operatingEndTime" as const,
      label: "운영 종료 시간",
      icon: <Clock className="w-5 h-5 text-red-400" />,
      type: "time",
      hint: "축제/매장이 마감되는 시간",
    },
    {
      key: "slotDurationMinutes" as const,
      label: "슬롯 간격 (분)",
      icon: <Timer className="w-5 h-5 text-emerald-500" />,
      type: "number",
      hint: "한 픽업 구간의 길이 (예: 15분, 30분)",
    },
    {
      key: "slotCapacity" as const,
      label: "슬롯당 최대 주문 수",
      icon: <Users className="w-5 h-5 text-purple-500" />,
      type: "number",
      hint: "한 시간대에 받을 수 있는 최대 주문 수 (인력 × 조리 속도 기준)",
    },
    {
      key: "minLeadTimeMinutes" as const,
      label: "최소 준비 시간 (분)",
      icon: <Timer className="w-5 h-5 text-orange-400" />,
      type: "number",
      hint: "지금 주문해도 최소 N분 뒤부터 픽업 가능",
    },
  ];

  return (
    <div className="min-h-full px-4 py-6 flex flex-col gap-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
          <Clock className="w-6 h-6 text-accent-blue" />
          픽업 시간 설정
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          운영 시간과 슬롯 설정을 조정하면 소비자 화면에 즉시 반영됩니다.
        </p>
      </div>

      {/* Config Cards */}
      <div className="flex flex-col gap-4">
        {configFields.map((field) => (
          <Card key={field.key} className="p-4 bg-white border-border shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">{field.icon}</div>
              <div className="flex-1">
                <label className="text-sm font-bold text-foreground block mb-1">
                  {field.label}
                </label>
                <p className="text-[11px] text-muted-foreground mb-2">{field.hint}</p>
                <Input
                  type={field.type}
                  value={localConfig[field.key]}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      [field.key]:
                        field.type === "number"
                          ? Number(e.target.value)
                          : e.target.value,
                    }))
                  }
                  className="bg-gray-50 border-border h-11 font-mono text-base"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Preview Summary */}
      <Card className="p-4 bg-accent-blue/5 border-accent-blue/20">
        <p className="text-sm font-bold text-accent-blue mb-2">미리보기 요약</p>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            ⏰ 운영 시간:{" "}
            <strong className="text-foreground">
              {localConfig.operatingStartTime} ~ {localConfig.operatingEndTime}
            </strong>
          </p>
          <p>
            📊 시간대 구간: 매{" "}
            <strong className="text-foreground">{localConfig.slotDurationMinutes}분</strong> 단위
          </p>
          <p>
            👥 슬롯당 최대:{" "}
            <strong className="text-foreground">{localConfig.slotCapacity}건</strong>
          </p>
          <p>
            ⏱️ 최소 준비 시간:{" "}
            <strong className="text-foreground">{localConfig.minLeadTimeMinutes}분</strong> (주문 후 최소 대기)
          </p>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          className="flex-1 h-14 bg-gradient-to-r from-accent-blue to-accent-neon text-white font-black text-base rounded-2xl shadow-sm"
        >
          <Save className="w-5 h-5 mr-2" />
          설정 저장
        </Button>
        <Button
          onClick={handleReset}
          variant="outline"
          className="h-14 px-6 border-border text-muted-foreground font-bold rounded-2xl"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          초기화
        </Button>
      </div>
    </div>
  );
}
