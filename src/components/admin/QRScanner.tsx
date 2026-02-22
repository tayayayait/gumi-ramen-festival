import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
}

export function QRScanner({ onScanSuccess, onScanFailure }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    let isMounted = true;
    let scanner: Html5QrcodeScanner | null = null;
    let timer: NodeJS.Timeout | null = null;

    if (isScanning && !scannerRef.current) {
      // React 18 Strict Mode 이중 마운트 방지용 지연
      timer = setTimeout(() => {
        if (!isMounted) return;
        scanner = new Html5QrcodeScanner(
          "reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
            rememberLastUsedCamera: true
          },
          false
        );
        scannerRef.current = scanner;

        scanner.render(
          (text, result) => {
            // 일시 정지 후 스캔 성공 이벤트 전달 (중복 스캔 방지)
            if (scannerRef.current) {
              try { scannerRef.current.pause(true); } catch(e) {}
              setTimeout(() => {
                try { scannerRef.current?.resume(); } catch(e) {}
              }, 2000);
            }
            onScanSuccess(text);
          },
          (err) => {
            if (onScanFailure) onScanFailure(err);
          }
        );
      }, 50);
    }

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      if (scanner) {
        scanner.clear().catch(() => {});
        if (scannerRef.current === scanner) scannerRef.current = null;
      }
    };
  }, [isScanning, onScanSuccess, onScanFailure]);

  return (
    <>
      <div className={!isScanning ? "block" : "hidden"}>
        <Button 
          type="button" 
          onClick={() => setIsScanning(true)} 
          variant="outline" 
          className="w-full flex items-center justify-center h-[200px] border-dashed text-muted-foreground hover:bg-white/50"
        >
          <div className="flex flex-col items-center gap-2">
            <Camera className="w-8 h-8" />
            <span>카메라 스캐너 열기</span>
          </div>
        </Button>
      </div>

      {/* DOM에서 제거하지 않고 CSS로 숨김 처리하여 clear() 비동기 처리 중 발생하는 NotFoundError 방지 */}
      <div className={`relative border rounded-xl overflow-hidden bg-black/5 ${isScanning ? "block" : "hidden"}`}>
        <div id="reader" className="w-full h-auto" />
        <Button 
          variant="danger" 
          size="icon" 
          className="absolute top-2 right-2 rounded-full z-10 w-8 h-8 opacity-80 shadow-md"
          onClick={() => {
            setIsScanning(false);
            if (scannerRef.current) {
              scannerRef.current.clear().catch(() => {});
              scannerRef.current = null;
            }
          }}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </>
  );
}
