import { useEffect, useRef, useCallback } from "react";
import { usePickupOrders, type PickupOrder, type OrderStatus } from "./usePickupOrders";
import { toast } from "@/hooks/use-toast";

/** 상태 변경 시 표시할 알림 설정 */
const STATUS_NOTIFICATION: Record<
  OrderStatus,
  { title: string; description: string; sound: boolean; browserNotif: boolean }
> = {
  pending: {
    title: "🍜 주문이 접수되었습니다",
    description: "조리를 준비하고 있습니다. 잠시만 기다려주세요!",
    sound: false,
    browserNotif: false,
  },
  ready_for_pickup: {
    title: "🎉 픽업 가능! 수령 데스크로 오세요",
    description: "수령 데스크에서 닉네임을 말해주세요.",
    sound: true,
    browserNotif: true,
  },
  completed: {
    title: "✅ 수령 완료",
    description: "맛있게 드세요!",
    sound: false,
    browserNotif: false,
  },
  cancelled: {
    title: "❌ 주문이 취소되었습니다",
    description: "문제가 있으시면 현장 스태프에게 문의해주세요.",
    sound: true,
    browserNotif: true,
  },
};

/** Web Audio API로 알림 사운드 재생 */
const playNotificationSound = () => {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    // 두 번 울리는 딩동 효과
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);        // A5
    oscillator.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.15); // C6
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);

    // 두 번째 톤
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.5);
    osc2.frequency.setValueAtTime(1318.5, ctx.currentTime + 0.65); // E6
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.5);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.9);
    osc2.start(ctx.currentTime + 0.5);
    osc2.stop(ctx.currentTime + 0.9);
  } catch {
    // AudioContext 미지원 환경에서 무시
  }
};

/** 브라우저 Notification API 알림 */
const showBrowserNotification = (title: string, body: string) => {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        new Notification(title, { body, icon: "/favicon.ico" });
      }
    });
  }
};

/**
 * 소비자측 주문 상태 변경 실시간 알림 훅.
 * usePickupOrders를 래핑하여, Realtime으로 수신된 상태 변경을
 * 토스트 + 사운드 + 브라우저 Notification으로 알림.
 */
export function useOrderNotifications() {
  const pickupOrders = usePickupOrders();
  const prevOrdersRef = useRef<Map<string, OrderStatus>>(new Map());
  const isInitialLoad = useRef(true);

  const handleStatusChange = useCallback(
    (orderId: string, orderNumber: string, newStatus: OrderStatus) => {
      const config = STATUS_NOTIFICATION[newStatus];
      if (!config) return;

      // 토스트 알림
      toast({
        title: config.title,
        description: `주문 #${orderNumber} - ${config.description}`,
        className:
          newStatus === "ready_for_pickup"
            ? "bg-blue-50 border-blue-200 text-blue-900 border-2"
            : newStatus === "cancelled"
            ? "bg-red-50 border-red-200 text-red-900 border-2"
            : undefined,
      });

      // 사운드 알림
      if (config.sound) {
        playNotificationSound();
      }

      // 브라우저 백그라운드 알림
      if (config.browserNotif && document.visibilityState === "hidden") {
        showBrowserNotification(config.title, `주문 #${orderNumber} - ${config.description}`);
      }
    },
    []
  );

  // 주문 목록 변경 감지 → 상태 diff 비교
  useEffect(() => {
    const currentMap = new Map<string, OrderStatus>();
    for (const order of pickupOrders.orders) {
      currentMap.set(order.id, order.status);
    }

    // 최초 로딩 시에는 알림을 보내지 않음
    if (isInitialLoad.current) {
      if (pickupOrders.orders.length > 0 || !pickupOrders.isLoadingOrders) {
        isInitialLoad.current = false;
        prevOrdersRef.current = currentMap;
      }
      return;
    }

    // 기존 주문의 상태가 변경된 것만 감지
    for (const order of pickupOrders.orders) {
      const prevStatus = prevOrdersRef.current.get(order.id);
      if (prevStatus && prevStatus !== order.status) {
        handleStatusChange(order.id, order.orderNumber, order.status);
      }
    }

    prevOrdersRef.current = currentMap;
  }, [pickupOrders.orders, pickupOrders.isLoadingOrders, handleStatusChange]);

  // 페이지 진입 시 브라우저 알림 권한 요청
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      // 약간의 딜레이 후 권한 요청 (UX 고려)
      const timer = setTimeout(() => {
        Notification.requestPermission();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  return pickupOrders;
}
