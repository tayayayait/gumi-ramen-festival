import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

interface SafetyOverlayProps {
  isActive: boolean; // AR 모드가 활성화되어 있는지 여부
}

export function SafetyOverlay({ isActive }: SafetyOverlayProps) {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setShowWarning(false);
      return;
    }

    // MVP 시뮬레이션: 카메라가 막 켜지거나, 모바일 디바이스 자이로스코프가 크게 변할 때
    // 실서비스에선 DeviceOrientationEvent 를 수신하여 alpha/beta/gamma 변화율 검사
    const handleOrientation = (event: DeviceOrientationEvent) => {
      // 대략적인 흔들림 감지 로직 (단순 시뮬레이션)
      if (event.beta && event.beta > 45) {
         // 휴대폰을 너무 위로 치켜들었을 때 (스마트폰 후면 카메라 사용 중이라면)
         // 또는 앞만 보고 걸어갈 때 주의 알림
         // 여기서는 단순히 임의 주기적으로 뜨도록 setInterval 구현체로 대체 (PC 웹 개발 환경 고려)
      }
    };

    window.addEventListener("deviceorientation", handleOrientation);
    
    // PC 데스크탑 테스트용 모의 인터벌 시뮬레이션
    const simInterval = setInterval(() => {
       setShowWarning(prev => !prev);
    }, 15000); // 15초마다 한 번씩 5초간 팝업
    
    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
      clearInterval(simInterval);
    };
  }, [isActive]);
  
  // 강제로 시연을 위해 초반 3초에 한번 띄움
  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => setShowWarning(true), 3000);
      const hideTimer = setTimeout(() => setShowWarning(false), 8000);
      return () => { clearTimeout(timer); clearTimeout(hideTimer); };
    }
  }, [isActive]);

  if (!isActive || !showWarning) return null;

  return (
    <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 z-50 animate-in fade-in zoom-in duration-300 pointer-events-none">
      <div className="bg-red-500/90 backdrop-blur-md border-2 border-red-400 p-4 rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.5)] flex flex-col items-center text-center gap-2">
        <AlertTriangle className="w-12 h-12 text-white animate-pulse" />
        <h3 className="text-white font-black text-lg">⚠️ 전방 주시 주의 ⚠️</h3>
        <p className="text-white/90 text-sm font-bold">
          주변에 뜨거운 라면을 든 사람이 많습니다.<br />
          화면에서 눈을 떼고 안전을 확인하세요!
        </p>
      </div>
    </div>
  );
}
