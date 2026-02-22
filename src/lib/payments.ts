import { toast } from "@/components/ui/use-toast";

// 가상의 결제 카드 정보 (MVP용 로컬 스토리지 또는 인메모리)
export interface SavedCard {
  id: string;
  cardNumberMasked: string; // ex: "****-****-****-1234"
  provider: string; // ex: "카카오페이", "토스페이", "신한카드"
}

// 목업: 이미 등록된 카드가 있다고 가정
export const MOCK_SAVED_CARD: SavedCard = {
  id: "card_01",
  cardNumberMasked: "****-****-****-8282",
  provider: "Ramen Pay",
};

/**
 * 스캔된 바코드 정보로 즉시 결제를 시뮬레이션합니다.
 * @param barcodeData 스캔된 바코드 데이터 (상품 ID 등)
 * @param cardId 결제에 사용할 등록된 카드 ID
 * @returns 결제 성공 여부
 */
export const processBarcodePayment = async (barcodeData: string, cardId: string = MOCK_SAVED_CARD.id): Promise<boolean> => {
  // 실제 환경에서는 PG사 연동 API (PortOne 등) 또는 자체 포인트 서버를 호출
  
  return new Promise((resolve) => {
    // 1.5초간 결제 진행 시뮬레이션
    setTimeout(() => {
      console.log(`[Payment] Processing ${barcodeData} with card ${cardId}`);
      
      // 랜덤 성공/실패 시뮬레이션보다 MVP는 무조건 성공하도록 처리
      const isSuccess = true;
      
      resolve(isSuccess);
    }, 1500);
  });
};
