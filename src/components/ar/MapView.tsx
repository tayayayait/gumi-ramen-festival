// ============================================================
// MapView — 포켓몬GO 스타일 Google Maps 지도 화면
// Google Maps JavaScript API 기반 (3D 건물 + 게임 스타일 다크맵)
// Leaflet 대비 훨씬 풍부한 시각적 퀄리티
// ============================================================

import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { APIProvider, Map, Marker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { RamenSpawn, getDistanceMeters, getRarityStyle } from '@/data/ramenSpawns';
import { MapPin, Navigation, Box, Layers } from 'lucide-react';

// 3D 뷰 lazy 로딩
const Map3DView = lazy(() => import('./Map3DView'));

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// ── 게임 스타일 다크 맵 JSON 스타일링 (포켓몬GO 느낌) ──
const GAME_MAP_STYLE: any[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4a5568' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#8b9dc3' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6c7a89' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1e3a2b' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3a7d44' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c3e50' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6c7a89' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3d5a80' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#8b9dc3' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2c3e50' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#8b9dc3' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d6b99' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#0d1b2a' }] },
];

// ── 라면 마커 컴포넌트 ──
interface RamenMarkerProps {
  ramen: RamenSpawn;
  playerLat: number;
  playerLng: number;
  interactionRadius: number;
  onTap: (ramen: RamenSpawn) => void;
}

function RamenMarker({ ramen, playerLat, playerLng, interactionRadius, onTap }: RamenMarkerProps) {
  const [showInfo, setShowInfo] = useState(false);
  const dist = getDistanceMeters(playerLat, playerLng, ramen.lat, ramen.lng);
  const isInRange = dist <= interactionRadius;

  const glowColor = ramen.rarity === 'legendary' ? 'rgba(234,179,8,0.8)' :
                    ramen.rarity === 'rare' ? 'rgba(59,130,246,0.6)' : 'rgba(255,255,255,0.2)';
  const borderColor = ramen.rarity === 'legendary' ? '#eab308' :
                      ramen.rarity === 'rare' ? '#3b82f6' : '#6b7280';

  return (
    <>
      <Marker
        position={{ lat: ramen.lat, lng: ramen.lng }}
        onClick={() => {
          if (isInRange) {
            onTap(ramen);
          } else {
            setShowInfo(true);
          }
        }}
        icon={{
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="24" fill="rgba(0,0,0,0.8)" stroke="${borderColor}" stroke-width="3"/>
              <text x="50%" y="54%" font-size="28" text-anchor="middle" dominant-baseline="middle">${ramen.emoji}</text>
            </svg>
          `)}`,
          scaledSize: typeof window !== 'undefined' ? new window.google.maps.Size(52, 52) : undefined,
          anchor: typeof window !== 'undefined' ? new window.google.maps.Point(26, 26) : undefined,
        }}
      />

      {showInfo && (
        <InfoWindow
          position={{ lat: ramen.lat, lng: ramen.lng }}
          onCloseClick={() => setShowInfo(false)}
        >
          <div style={{ textAlign: 'center', padding: '4px', minWidth: '120px' }}>
            <div style={{ fontSize: '28px', marginBottom: '4px' }}>{ramen.emoji}</div>
            <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{ramen.name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {Math.round(dist)}m {isInRange ? '✅ 포획 가능' : '❌ 너무 멀어요'}
            </div>
            {isInRange && (
              <button
                onClick={() => { setShowInfo(false); onTap(ramen); }}
                style={{
                  marginTop: '8px',
                  padding: '4px 16px',
                  background: '#f97316',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                만나러 가기!
              </button>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

// ── 플레이어 마커 ──
function PlayerMarker({ lat, lng }: { lat: number; lng: number }) {
  return (
    <Marker 
      position={{ lat, lng }} 
      icon={{
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="12" fill="#3b82f6" stroke="white" stroke-width="4"/>
          </svg>
        `)}`,
        scaledSize: typeof window !== 'undefined' ? new window.google.maps.Size(32, 32) : undefined,
        anchor: typeof window !== 'undefined' ? new window.google.maps.Point(16, 16) : undefined,
      }}
    />
  );
}

// ── 인터랙션 반경 표시용 (Circle 대체) ──
function InteractionCircle({ lat, lng, radius }: { lat: number; lng: number; radius: number }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const circle = new window.google.maps.Circle({
      center: { lat, lng },
      radius,
      strokeColor: '#3b82f6',
      strokeOpacity: 0.5,
      strokeWeight: 2,
      fillColor: '#3b82f6',
      fillOpacity: 0.06,
      map,
    });

    return () => circle.setMap(null);
  }, [map, lat, lng, radius]);

  return null;
}

// ── Props ──
interface MapViewProps {
  playerPosition: { lat: number; lng: number } | null;
  spawns: RamenSpawn[];
  onRamenTap: (ramen: RamenSpawn) => void;
  stickerCount: number;
  interactionRadius?: number;
}

// ── CSS 애니메이션 주입 ──
const styleTag = typeof document !== 'undefined' ? (() => {
  const existing = document.getElementById('ramen-go-map-styles');
  if (existing) return existing;
  const style = document.createElement('style');
  style.id = 'ramen-go-map-styles';
  style.textContent = `
    @keyframes markerBob {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    @keyframes playerPulse {
      0%, 100% { box-shadow: 0 0 20px rgba(59,130,246,0.8); }
      50% { box-shadow: 0 0 35px rgba(59,130,246,1), 0 0 60px rgba(59,130,246,0.4); }
    }
  `;
  document.head.appendChild(style);
  return style;
})() : null;

export default function MapView({
  playerPosition,
  spawns,
  onRamenTap,
  stickerCount,
  interactionRadius = 50,
}: MapViewProps) {
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
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

  // API 키가 없으면 경고
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

  const center = { lat: playerPosition.lat, lng: playerPosition.lng };

  // 3D 모드
  if (viewMode === '3d') {
    return (
      <div className="relative h-full w-full">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full w-full bg-black">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white font-bold">3D 맵 로딩 중...</p>
            </div>
          </div>
        }>
          <Map3DView
            playerPosition={playerPosition}
            spawns={spawns}
            onRamenTap={onRamenTap}
            stickerCount={stickerCount}
            interactionRadius={interactionRadius}
          />
        </Suspense>

        {/* 2D로 전환 버튼 */}
        <button
          onClick={() => setViewMode('2d')}
          className="absolute top-20 left-4 z-20 p-3 bg-black/70 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-colors flex items-center gap-2"
        >
          <Layers className="w-4 h-4" />
          <span className="text-xs font-bold">2D</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* 상단 HUD */}
      <div className="absolute top-6 left-0 right-0 z-10 flex justify-between px-4 pointer-events-none">
        <div className="bg-black/70 backdrop-blur-md border border-accent-orange/50 rounded-full px-4 py-2 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-accent-blue animate-pulse" />
          <span className="text-xs font-bold text-white">행사장 AR 헌트 존</span>
        </div>

        <div className="bg-black/70 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 flex items-center gap-2">
          <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-accent-orange">
            스티커 {stickerCount}/5
          </span>
        </div>
      </div>

      {/* 3D 전환 버튼 */}
      <button
        onClick={() => setViewMode('3d')}
        className="absolute top-20 left-4 z-10 p-3 bg-black/70 backdrop-blur-md border border-purple-500/50 rounded-full text-white hover:bg-purple-500/20 transition-colors flex items-center gap-2"
      >
        <Box className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-bold text-purple-300">3D</span>
      </button>

      {/* Google Maps */}
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          defaultCenter={center}
          defaultZoom={17}
          gestureHandling="greedy"
          disableDefaultUI={true}
          styles={GAME_MAP_STYLE}
          style={{ width: '100%', height: '100%' }}
          // @ts-ignore
          tiltInteractionEnabled={false}
          headingInteractionEnabled={false}
        >
          {/* 플레이어 마커 */}
          <PlayerMarker lat={playerPosition.lat} lng={playerPosition.lng} />

          {/* 인터랙션 반경 */}
          <InteractionCircle lat={playerPosition.lat} lng={playerPosition.lng} radius={interactionRadius} />

          {/* 라면 스폰 마커들 */}
          {spawns.map((ramen) => (
            <RamenMarker
              key={ramen.id}
              ramen={ramen}
              playerLat={playerPosition.lat}
              playerLng={playerPosition.lng}
              interactionRadius={interactionRadius}
              onTap={onRamenTap}
            />
          ))}
        </Map>
      </APIProvider>

      {/* 하단 HUD — 근처 라면 레이더 */}
      <div className="absolute bottom-4 left-0 right-0 z-10 px-4 pointer-events-none">
        <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-3 pointer-events-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/70 text-xs font-bold">🍜 근처 라면</span>
            <span className="text-accent-orange text-xs font-bold">{spawns.length}마리 발견</span>
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
