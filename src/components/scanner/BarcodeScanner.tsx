import { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { processBarcodePayment, MOCK_SAVED_CARD } from "@/lib/payments";
import { ScanLine, X, Loader2, CreditCard } from "lucide-react";

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentSuccess?: () => void;
}

export function BarcodeScanner({ open, onOpenChange, onPaymentSuccess }: BarcodeScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // MVP 시뮬레이션: 카메라 중앙을 클릭하거나 타이머를 두지 않고, 하단의 [수동 스캔(시뮬레이션)] 버튼으로 처리
  // 실제 연동 시엔 @zxing/browser 혹은 quaggajs 등을 사용하여 비디오 프레임에서 바코드 정보를 추출함.
  const handleSimulatedScan = async () => {
    setIsProcessing(true);
    
    // 임의의 바코드 데이터
    const mockBarcode = "8801043014830"; // 신라면 바코드 예시
    
    try {
      const success = await processBarcodePayment(mockBarcode);
      
      if (success) {
        toast({
          title: "결제 승인 완료! 🎉",
          description: `${MOCK_SAVED_CARD.provider}(${MOCK_SAVED_CARD.cardNumberMasked})로 결제되었습니다.`,
        });
        if (onPaymentSuccess) onPaymentSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      toast({
        title: "결제 실패",
        description: "바코드 스캔 또는 결제 처리에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isProcessing && onOpenChange(val)}>
      <DialogContent className="p-0 border-0 bg-black max-w-md h-[80vh] sm:h-[600px] overflow-hidden flex flex-col rounded-2xl">
        <div className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-black/50 backdrop-blur px-3 py-1.5 rounded-full">
           <CreditCard className="w-4 h-4 text-accent-blue" />
           <span className="text-white text-xs font-bold">{MOCK_SAVED_CARD.provider} 활성화됨</span>
        </div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-4 right-4 z-50 text-white bg-black/30 hover:bg-black/60 rounded-full"
          onClick={() => onOpenChange(false)}
          disabled={isProcessing}
        >
          <X className="w-5 h-5" />
        </Button>

        <div className="flex-1 relative bg-zinc-900 flex items-center justify-center overflow-hidden">
          {!isProcessing ? (
            <>
              <Webcam
                ref={webcamRef}
                audio={false}
                videoConstraints={{ facingMode: "environment" }}
                className="absolute inset-0 w-full h-full object-cover z-0"
              />
              
              {/* 스캐너 마스크 오버레이 */}
              <div className="absolute inset-0 z-10 box-border pointer-events-none border-[50px] sm:border-[100px] border-black/60 transition-all">
                <div className="w-full h-full border-2 border-accent-blue relative">
                   <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-accent-blue"></div>
                   <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-accent-blue"></div>
                   <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-accent-blue"></div>
                   <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-accent-blue"></div>
                   
                   {/* 스캐닝 레이저 라인 애니메이션 */}
                   <div className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_8px_red] animate-scan-line"></div>
                </div>
              </div>
              
              <div className="absolute bottom-24 z-20 text-center w-full px-6">
                 <p className="text-white text-sm bg-black/50 backdrop-blur rounded-lg py-2">
                   상품 바코드를 사각형 안에 맞춰주세요.
                 </p>
              </div>

              {/* 시뮬레이션용 수동 트리거 버튼 (실제론 비디오 스트림 자동 파싱) */}
              <div className="absolute bottom-6 z-20 w-full px-6 flex justify-center">
                 <Button 
                   onClick={handleSimulatedScan}
                   className="w-full max-w-xs h-14 bg-accent-blue hover:bg-cyan-500 text-black shadow-glow-blue font-bold text-lg"
                 >
                   <ScanLine className="w-5 h-5 mr-2" />
                   바코드 스캔 테스트
                 </Button>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-white">
               <Loader2 className="w-12 h-12 text-accent-blue animate-spin mb-4" />
               <p className="text-lg font-bold">결제 진행 중...</p>
               <p className="text-sm text-muted-foreground mt-2">잠시만 기다려주세요.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
