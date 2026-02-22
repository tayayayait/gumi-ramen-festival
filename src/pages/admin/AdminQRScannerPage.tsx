import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { usePickupOrders, type PickupOrder } from "@/hooks/usePickupOrders";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ScanLine, Loader2, CameraOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

let isScannerStartingGlobal = false;

export default function AdminQRScannerPage() {
  const [scannedOrder, setScannedOrder] = useState<PickupOrder | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const { getOrderById, getOrderByBarcode, updateOrderStatus, orders } = usePickupOrders({
    isAdmin: true,
  });
  const { toast } = useToast();
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // 최신 콜백/상태를 참조하기 위한 ref
  const callbacksRef = useRef({
    getOrderById,
    getOrderByBarcode,
    updateOrderStatus,
    orders,
    toast,
    scannedOrder,
  });

  useEffect(() => {
    callbacksRef.current = {
      getOrderById,
      getOrderByBarcode,
      updateOrderStatus,
      orders,
      toast,
      scannedOrder,
    };
  });

  useEffect(() => {
    let isMounted = true;
    let html5QrCode: Html5Qrcode | null = null;
    let resumeTimeoutFunc: NodeJS.Timeout | null = null;

    const initScanner = async () => {
      // React 18 Strict Mode에서 중복 실행 충돌을 줄이기 위한 지연
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (!isMounted) return;

      if (isScannerStartingGlobal) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (!isMounted) return;
      }

      isScannerStartingGlobal = true;
      html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 300, height: 300 },
            aspectRatio: 1.0,
          },
          async (decodedText) => {
            const {
              getOrderById: getById,
              getOrderByBarcode: getByBarcode,
              updateOrderStatus: updateStatus,
              orders: currentOrders,
              toast: showToast,
              scannedOrder: currentOrder,
            } = callbacksRef.current;

            // 이미 성공 화면을 보여주는 중이면 무시
            if (currentOrder) return;

            // 일시 정지 상태면 무시
            if (html5QrCode?.getState() === Html5QrcodeScannerState.PAUSED) return;

            const order =
              getById(decodedText) ||
              getByBarcode(decodedText) ||
              currentOrders.find((o) => o.orderNumber === decodedText);

            if (!order) {
              showToast({
                title: "주문을 찾을 수 없습니다",
                description: `스캔값을 확인해 주세요: ${decodedText.slice(0, 10)}...`,
                variant: "destructive",
              });
              return;
            }

            if (order.status === "completed") {
              showToast({
                title: "이미 수령 완료된 주문입니다",
                variant: "destructive",
              });
              return;
            }

            // 스캔 성공 후 잠시 정지
            try {
              if (html5QrCode?.getState() === Html5QrcodeScannerState.SCANNING) {
                html5QrCode.pause();
              }
            } catch (e) {
              console.error(e);
            }

            // 즉시 완료 상태로 변경
            const updateResult = await updateStatus(order.id, "completed");
            if (!updateResult.success) {
              showToast({
                title: "주문 상태 변경 실패",
                description: updateResult.message,
                variant: "destructive",
              });

              try {
                if (html5QrCode?.getState() === Html5QrcodeScannerState.PAUSED) {
                  html5QrCode.resume();
                }
              } catch (resumeError) {
                console.error(resumeError);
              }
              return;
            }

            setScannedOrder(order);

            // 5초 후 자동 복귀
            resumeTimeoutFunc = setTimeout(() => {
              if (!isMounted) return;
              setScannedOrder(null);
              try {
                if (html5QrCode?.getState() === Html5QrcodeScannerState.PAUSED) {
                  html5QrCode.resume();
                }
              } catch (e) {
                console.error(e);
              }
            }, 5000);
          },
          () => {
            // tracking noise 무시
          }
        );

        if (!isMounted && html5QrCode) {
          if (html5QrCode.isScanning) {
            await html5QrCode.stop().catch(() => {});
          }
          html5QrCode.clear();
        } else {
          setCameraError(null);
          setIsStarting(false);
        }
      } catch (err: unknown) {
        console.error("카메라 초기화 실패:", err);
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : null;
          setIsStarting(false);
          setCameraError(errorMessage || "카메라를 사용할 수 없습니다.");
        }
      } finally {
        isScannerStartingGlobal = false;
      }
    };

    void initScanner();

    return () => {
      isMounted = false;
      if (resumeTimeoutFunc) clearTimeout(resumeTimeoutFunc);

      if (html5QrCode) {
        try {
          if (html5QrCode.isScanning) {
            html5QrCode
              .stop()
              .then(() => {
                if (html5QrCode) html5QrCode.clear();
              })
              .catch(console.error);
          } else {
            html5QrCode.clear();
          }
        } catch (e) {
          console.error("Scanner clear error", e);
        }
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto space-y-4">
      <div className={scannedOrder ? "hidden" : "block"}>
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <ScanLine className="w-7 h-7 text-blue-600" />
            현장 수령 스캔
          </h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden text-black relative">
          <div className="bg-blue-50 border-b border-blue-100 p-4">
            <p className="text-blue-800 font-bold text-center">
              고객의 모바일 라면 QR을 중앙 프레임에 맞춰 주세요.
              <br />
              <span className="text-sm font-normal text-blue-600">
                스캔 성공 시 자동으로 수령 완료(Completed) 처리됩니다.
              </span>
            </p>
          </div>

          {isStarting && !cameraError && (
            <div className="absolute inset-0 top-[88px] flex flex-col justify-center items-center bg-white z-10 w-full min-h-[300px]">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-gray-500 font-medium">카메라를 불러오는 중입니다...</p>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 top-[88px] flex flex-col justify-center items-center bg-white z-10 p-6 text-center w-full min-h-[300px]">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <CameraOff className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-gray-800 font-bold text-lg mb-2">카메라 접근 실패</p>
              <p className="text-gray-500 text-sm mb-6 max-w-[280px]">
                {cameraError.includes("Device in use")
                  ? "카메라가 다른 앱 또는 탭에서 사용 중입니다. 다른 앱을 종료한 뒤 새로고침해 주세요."
                  : "카메라 권한이 차단되었거나 기기를 찾을 수 없습니다."}
              </p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="font-bold"
              >
                새로고침 후 다시 시도
              </Button>
            </div>
          )}

          <div id="qr-reader" className="w-full border-none min-h-[300px]" />
        </div>
      </div>

      {scannedOrder && (
        <div className="flex flex-col items-center justify-center p-8 min-h-[80vh] bg-green-500 rounded-3xl animate-in zoom-in duration-300">
          <CheckCircle2 className="w-24 h-24 text-white mb-6 animate-bounce" />
          <h1 className="text-4xl font-black text-white mb-2 text-center">수령 확인!</h1>
          <p className="text-green-100 font-bold mb-8">주문번호: {scannedOrder.orderNumber}</p>

          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-gray-500 font-bold text-sm mb-4">전달할 주문 상품</h3>
            <div className="space-y-3">
              {scannedOrder.items.map((item) => (
                <div
                  key={item.menuId}
                  className="flex justify-between items-center bg-gray-50 p-3 rounded-lg"
                >
                  <span className="font-bold text-gray-800 text-lg">{item.name}</span>
                  <span className="font-black text-blue-600 text-2xl">{item.quantity}개</span>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={() => {
              setScannedOrder(null);
              try {
                if (
                  scannerRef.current &&
                  scannerRef.current.getState() === Html5QrcodeScannerState.PAUSED
                ) {
                  scannerRef.current.resume();
                }
              } catch (e) {
                console.error(e);
              }
            }}
            className="mt-8 bg-white text-green-600 hover:bg-gray-100 font-bold px-8 py-6 rounded-full text-lg shadow-lg"
          >
            스캔 화면으로 즉시 돌아가기
          </Button>
        </div>
      )}
    </div>
  );
}
