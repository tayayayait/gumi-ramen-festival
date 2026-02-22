import { useState, useEffect } from "react";
import { loadTossPayments } from "@tosspayments/payment-sdk";
import { Button } from "@/components/ui/button";

const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;

interface TossPaymentProps {
  price: number;
  orderName: string;
  orderId: string;
  onSuccess: (orderId: string, amount: number) => void;
  onFail?: () => void;
  onCancel?: () => void;
}

export function TossPaymentWidget({ price, orderName, orderId, onSuccess, onFail, onCancel }: TossPaymentProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // SDK 로딩 준비 대기
    setIsReady(true);
  }, []);

  const requestPayment = async () => {
    try {
      if (!clientKey) {
        throw new Error("VITE_TOSS_CLIENT_KEY is not configured.");
      }

      const tossPayments = await loadTossPayments(clientKey);
      
      // 결제창(팝업/리다이렉트) 띄우기
      await tossPayments.requestPayment("카드", {
        amount: price,
        orderId,
        orderName,
        customerName: "스마트픽업고객",
        successUrl: `${window.location.origin}/pickup?toss_success=true&orderId=${orderId}&amount=${price}`,
        failUrl: `${window.location.origin}/pickup?toss_fail=true&orderId=${orderId}`,
      });
    } catch (error) {
       console.error("결제 에러", error);
       if(onFail) onFail();
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
       <div className="p-4 bg-primary-light/50 border border-accent-blue/30 rounded-xl text-center">
         <p className="text-white text-sm font-bold">토스페이먼츠 안전 결제창</p>
         <p className="text-muted-foreground text-xs mt-1">결제하기를 누르면 토스 결제 화면으로 이동합니다.</p>
       </div>

       {/* 결제하기 액션 영역 */}
       <div className="flex gap-2 w-full mt-4">
          <Button variant="outline" className="flex-1 border-gray-300 text-gray-700 font-bold h-12 rounded-xl" onClick={onCancel}>
             취소
          </Button>
          <Button 
             disabled={!isReady}
             onClick={requestPayment}
             className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black h-12 rounded-xl shadow-lg transition-all disabled:bg-gray-300 disabled:text-gray-500"
          >
             {price.toLocaleString()}원 결제하기
          </Button>
       </div>
    </div>
  );
}
