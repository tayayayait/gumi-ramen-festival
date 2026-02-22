// ============================================================
// Map3DView — Google Maps 3D Photorealistic Tiles 뷰어
// gmp-map-3d 웹 컴포넌트를 React에서 래핑
// 구미 원평동의 3D 실사 건물을 렌더링하여 아이템 위치를 설계
// ============================================================

import { useEffect, useRef, useCallback, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { RamenSpawn, getDistanceMeters, getRarityStyle } from '@/data/ramenSpawns';
import { MapPin, Navigation, RotateCcw, Eye } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const GOOGLE_MAPS_MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || '';

// ── 구미 원평동 기본 좌표 ──
const GUMI_WONPYEONG = { lat: 36.1190, lng: 128.3446, altitude: 80 };

// ── TypeScript 선언: gmp-map-3d / gmp-marker-3d ──
declare global {
  interface Window {
    google: any;
  }
  namespace JSX {
    interface IntrinsicElements {
      'gmp-map-3d': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        center?: string;
        tilt?: string;
        heading?: string;
        range?: string;
        'default-labels-disabled'?: string;
      }, HTMLElement>;
      'gmp-marker-3d': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        position?: string;
        label?: string;
        'altitude-mode'?: string;
      }, HTMLElement>;
    }
  }
}

// ── 3D 마커 오버레이 (HTML 기반) ──
interface Marker3DOverlayProps {
  ramen: RamenSpawn;
  playerLat: number;
  playerLng: number;
  interactionRadius: number;
  onTap: (ramen: RamenSpawn) => void;
}

function Marker3DInfo({ ramen, distance, inRange, onTap }: {
  ramen: RamenSpawn;
  distance: number;
  inRange: boolean;
  onTap: () => void;
}) {
  const style = getRarityStyle(ramen.rarity);

  return (
    <div className={`flex flex-col items-center gap-1 p-2 rounded-xl border ${style.border} ${style.bg} ${style.glow} backdrop-blur-md`}>
      <span className="text-2xl">{ramen.emoji}</span>
      <span className="text-xs font-bold text-white">{ramen.name}</span>
      <span className="text-[10px] text-white/60">{Math.round(distance)}m</span>
      {inRange && (
        <button
          onClick={onTap}
          className="mt-1 px-3 py-1 bg-accent-orange text-white text-[10px] rounded-full font-bold hover:bg-accent-orange/80 transition-colors"
        >
          포획하기!
        </button>
      )}
    </div>
  );
}

// ── 메인 3D 맵 컴포넌트 ──
interface Map3DViewProps {
  playerPosition: { lat: number; lng: number } | null;
  spawns: RamenSpawn[];
  onRamenTap: (ramen: RamenSpawn) => void;
  stickerCount: number;
  interactionRadius?: number;
}

export default function Map3DView({
  playerPosition,
  spawns,
  onRamenTap,
  stickerCount,
  interactionRadius = 50,
}: Map3DViewProps) {
  const map3dRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [viewAngle, setViewAngle] = useState({ tilt: 60, heading: 0 });

  // gmp-map-3d 요소를 동적으로 생성
  useEffect(() => {
    if (!containerRef.current || !GOOGLE_MAPS_API_KEY) return;

    // maps3d 라이브러리 로드를 위해 importLibrary 사용
    const loadMap3D = async () => {
      try {
        // @ts-ignore - google.maps.importLibrary는 동적 로딩
        await google.maps.importLibrary('maps3d');

        if (!containerRef.current) return;

        // 기존 맵 제거
        if (map3dRef.current) {
          map3dRef.current.remove();
        }

        const center = playerPosition || GUMI_WONPYEONG;

        // gmp-map-3d 요소 생성
        const map3d = document.createElement('gmp-map-3d');
        map3d.setAttribute('center', `${center.lat},${center.lng},${GUMI_WONPYEONG.altitude}`);
        map3d.setAttribute('tilt', String(viewAngle.tilt));
        map3d.setAttribute('heading', String(viewAngle.heading));
        map3d.setAttribute('range', '500'); // 500m 시야 범위
        map3d.setAttribute('default-labels-disabled', '');
        map3d.style.width = '100%';
        map3d.style.height = '100%';

        // 라면 스폰 마커 추가
        spawns.forEach((ramen) => {
          const marker = document.createElement('gmp-marker-3d');
          marker.setAttribute('position', `${ramen.lat},${ramen.lng},${GUMI_WONPYEONG.altitude + 10}`);
          marker.setAttribute('label', `${ramen.emoji} ${ramen.name}`);
          marker.setAttribute('altitude-mode', 'absolute');

          // 마커 클릭 이벤트
          marker.addEventListener('click', () => {
            if (playerPosition) {
              const dist = getDistanceMeters(playerPosition.lat, playerPosition.lng, ramen.lat, ramen.lng);
              if (dist <= interactionRadius) {
                onRamenTap(ramen);
              }
            }
          });

          map3d.appendChild(marker);
        });

        // 플레이어 마커 추가
        if (playerPosition) {
          const playerMarker = document.createElement('gmp-marker-3d');
          playerMarker.setAttribute('position', `${playerPosition.lat},${playerPosition.lng},${GUMI_WONPYEONG.altitude + 5}`);
          playerMarker.setAttribute('label', '📍 나');
          playerMarker.setAttribute('altitude-mode', 'absolute');
          map3d.appendChild(playerMarker);
        }

        containerRef.current.appendChild(map3d);
        map3dRef.current = map3d;
        setIsLoaded(true);
      } catch (err) {
        console.error('Map 3D 로딩 실패:', err);
      }
    };

    // google.maps가 로드된 후 실행
    const checkAndLoad = () => {
      if (typeof window.google !== 'undefined' && window.google.maps) {
        loadMap3D();
      } else {
        // APIProvider가 로드될 때까지 대기
        setTimeout(checkAndLoad, 500);
      }
    };
    checkAndLoad();

    return () => {
      if (map3dRef.current) {
        map3dRef.current.remove();
        map3dRef.current = null;
      }
    };
  }, [playerPosition, spawns, GOOGLE_MAPS_API_KEY]);

  // 뷰 각도 변경 핸들러
  const handleRotate = useCallback(() => {
    setViewAngle(prev => ({
      ...prev,
      heading: (prev.heading + 45) % 360,
    }));
    if (map3dRef.current) {
      map3dRef.current.setAttribute('heading', String((viewAngle.heading + 45) % 360));
    }
  }, [viewAngle]);

  const handleTiltToggle = useCallback(() => {
    const newTilt = viewAngle.tilt === 60 ? 30 : viewAngle.tilt === 30 ? 0 : 60;
    setViewAngle(prev => ({ ...prev, tilt: newTilt }));
    if (map3dRef.current) {
      map3dRef.current.setAttribute('tilt', String(newTilt));
    }
  }, [viewAngle]);

  // GPS 준비 안됨
  if (!playerPosition) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-black">
        <div className="text-center">
          <Navigation className="w-12 h-12 text-accent-blue animate-spin mx-auto mb-4" />
          <p className="text-white font-bold text-lg">GPS 위치 확인 중...</p>
          <p className="text-white/60 text-sm mt-1">위치 권한을 허용해주세요</p>
        </div>
      </div>
    );
  }

  // API 키 없음
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-black">
        <div className="text-center p-6">
          <p className="text-red-400 font-bold text-lg">⚠️ Google Maps API 키가 없습니다</p>
          <p className="text-white/60 text-sm mt-2">.env 파일에 VITE_GOOGLE_MAPS_API_KEY를 설정해주세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* 상단 HUD */}
      <div className="absolute top-6 left-0 right-0 z-10 flex justify-between px-4 pointer-events-none">
        <div className="bg-black/70 backdrop-blur-md border border-purple-500/50 rounded-full px-4 py-2 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-purple-400 animate-pulse" />
          <span className="text-xs font-bold text-white">3D AR 설계 모드</span>
        </div>

        <div className="bg-black/70 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 flex items-center gap-2">
          <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-accent-orange">
            스티커 {stickerCount}/5
          </span>
        </div>
      </div>

      {/* 3D 제어 버튼 */}
      <div className="absolute top-20 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={handleRotate}
          className="p-3 bg-black/70 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-colors pointer-events-auto"
          title="회전"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          onClick={handleTiltToggle}
          className="p-3 bg-black/70 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-colors pointer-events-auto"
          title="기울기"
        >
          <Eye className="w-5 h-5" />
        </button>
      </div>

      {/* Google Maps API Provider + gmp-map-3d 컨테이너 */}
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY} version="beta">
        <div ref={containerRef} className="w-full h-full" />
      </APIProvider>

      {/* 로딩 오버레이 */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-bold">3D 포토리얼리스틱 맵 로딩 중...</p>
            <p className="text-white/50 text-sm mt-1">건물 타일을 다운로드하고 있습니다</p>
          </div>
        </div>
      )}

      {/* 하단 HUD — 근처 라면 레이더 */}
      <div className="absolute bottom-4 left-0 right-0 z-10 px-4 pointer-events-none">
        <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-3 pointer-events-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/70 text-xs font-bold">🍜 3D 뷰 — 근처 라면</span>
            <span className="text-purple-400 text-xs font-bold">{spawns.length}마리 발견</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {spawns
              .map(r => ({
                ...r,
                dist: getDistanceMeters(playerPosition.lat, playerPosition.lng, r.lat, r.lng)
              }))
              .sort((a, b) => a.dist - b.dist)
              .slice(0, 5)
              .map((ramen) => {
                const inRange = ramen.dist <= interactionRadius;
                const style = getRarityStyle(ramen.rarity);
                return (
                  <button
                    key={ramen.id}
                    onClick={() => inRange && onRamenTap(ramen)}
                    disabled={!inRange}
                    className={`flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-xl border ${style.border} ${style.bg} ${style.glow} transition-all ${
                      inRange ? 'opacity-100 cursor-pointer active:scale-95' : 'opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-xl">{ramen.emoji}</span>
                    <span className="text-[10px] text-white/80 font-bold">{Math.round(ramen.dist)}m</span>
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
