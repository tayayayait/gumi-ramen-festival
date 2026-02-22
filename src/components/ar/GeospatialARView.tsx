// ============================================================
// GeospatialARView — WebXR + GPS 기반 Geospatial AR 시뮬레이션
// ARCore Geospatial API의 웹 대체 구현
// GPS 좌표 + DeviceOrientation으로 위치 기반 AR 배치
// ============================================================

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Sphere, Torus, Cone, Html } from '@react-three/drei';
import * as THREE from 'three';
import { RamenSpawn, getDistanceMeters } from '@/data/ramenSpawns';

// ── 방위각 계산 (bearing) ──
function getBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return ((θ * 180) / Math.PI + 360) % 360; // 0-360도
}

// ── WebXR 지원 여부 체크 ──
export async function checkWebXRSupport(): Promise<boolean> {
  if (!navigator.xr) return false;
  try {
    return await navigator.xr.isSessionSupported('immersive-ar');
  } catch {
    return false;
  }
}

// ── GPS 기반 3D 라면 배치 ──
interface GeoRamenProps {
  ramen: RamenSpawn;
  playerLat: number;
  playerLng: number;
  deviceHeading: number; // 디바이스가 향한 방위각 (0=북)
  onCatch: () => void;
}

function GeoRamen({ ramen, playerLat, playerLng, deviceHeading, onCatch }: GeoRamenProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHover] = useState(false);

  // 라면까지의 거리와 방위각 계산
  const distance = useMemo(
    () => getDistanceMeters(playerLat, playerLng, ramen.lat, ramen.lng),
    [playerLat, playerLng, ramen.lat, ramen.lng]
  );

  const bearing = useMemo(
    () => getBearing(playerLat, playerLng, ramen.lat, ramen.lng),
    [playerLat, playerLng, ramen.lat, ramen.lng]
  );

  // 디바이스 방위 기준 상대 각도 계산
  const relativeAngle = useMemo(() => {
    const angle = ((bearing - deviceHeading + 360) % 360) * (Math.PI / 180);
    return angle;
  }, [bearing, deviceHeading]);

  // 3D 공간에서의 위치 계산 (거리 기반, 최대 15m로 스케일 다운)
  const position = useMemo((): [number, number, number] => {
    const scaledDist = Math.min(distance / 10, 15); // 10:1 축소, 최대 15 단위
    const x = Math.sin(relativeAngle) * scaledDist;
    const z = -Math.cos(relativeAngle) * scaledDist;
    const y = -0.5; // 바닥 근처
    return [x, y, z];
  }, [relativeAngle, distance]);

  // 애니메이션
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  const bowlColor = ramen.color || '#e23e3e';
  const scale = distance < 50 ? 1.2 : distance < 100 ? 0.9 : 0.6;

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
      <group
        ref={meshRef}
        position={position}
        onClick={(e) => {
          e.stopPropagation();
          onCatch();
        }}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
        scale={hovered ? scale * 1.15 : scale}
      >
        {/* 그릇 */}
        <Sphere args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} rotation={[Math.PI, 0, 0]}>
          <meshStandardMaterial color={bowlColor} roughness={0.3} metalness={0.1} />
        </Sphere>

        {/* 국물 */}
        <Torus args={[0.85, 0.1, 16, 100]} position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#f59e0b" roughness={0.5} />
        </Torus>

        {/* 면발 */}
        <Cone args={[0.65, 0.5, 16]} position={[0, 0.2, 0]}>
          <meshStandardMaterial color="#fef08a" roughness={0.6} />
        </Cone>

        {/* 거리 라벨 */}
        <Html position={[0, 1.8, 0]} center distanceFactor={8}>
          <div className="bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-center whitespace-nowrap pointer-events-none">
            <span className="text-sm font-bold text-white">{ramen.emoji} {ramen.name}</span>
            <br />
            <span className="text-xs text-white/70">{Math.round(distance)}m</span>
            <span className="text-xs ml-1">{distance <= 50 ? '✅' : '🔴'}</span>
          </div>
        </Html>

        {/* 김(steam) */}
        {[...Array(2)].map((_, i) => (
          <SteamParticle key={i} delay={i * 0.7} />
        ))}
      </group>
    </Float>
  );
}

// ── 김(steam) 파티클 ──
function SteamParticle({ delay }: { delay: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const t = ((state.clock.elapsedTime + delay) % 3) / 3;
      meshRef.current.position.y = 0.5 + t * 1.5;
      meshRef.current.scale.setScalar(0.08 + t * 0.2);
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.3 * (1 - t);
    }
  });

  return (
    <mesh ref={meshRef} position={[(Math.random() - 0.5) * 0.3, 0.5, (Math.random() - 0.5) * 0.2]}>
      <sphereGeometry args={[0.12, 8, 8]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.25} />
    </mesh>
  );
}

// ── 나침반 기반 카메라 제어 ──
function CompassCamera() {
  const { camera } = useThree();

  useEffect(() => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (isTouchDevice && window.DeviceOrientationEvent) {
      const handleOrientation = (e: DeviceOrientationEvent) => {
        const beta = e.beta ? e.beta * (Math.PI / 180) : 0;
        const gamma = e.gamma ? e.gamma * (Math.PI / 180) : 0;

        camera.rotation.set(
          THREE.MathUtils.lerp(camera.rotation.x, beta - Math.PI / 2, 0.08),
          THREE.MathUtils.lerp(camera.rotation.y, -gamma, 0.08),
          0
        );
      };

      window.addEventListener('deviceorientation', handleOrientation);
      return () => window.removeEventListener('deviceorientation', handleOrientation);
    } else {
      // 데스크톱: 마우스로 시점 제어
      const handleMouseMove = (e: MouseEvent) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -(e.clientY / window.innerHeight) * 2 + 1;

        camera.rotation.set(
          THREE.MathUtils.lerp(camera.rotation.x, y * 0.4, 0.08),
          THREE.MathUtils.lerp(camera.rotation.y, -x * 0.6, 0.08),
          0
        );
      };
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [camera]);

  return null;
}

// ── 나침반 HUD ──
function CompassHUD({ heading }: { heading: number }) {
  return (
    <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-2">
        <div
          className="w-6 h-6 flex items-center justify-center text-red-400 font-bold text-sm transition-transform duration-300"
          style={{ transform: `rotate(${-heading}deg)` }}
        >
          ▲
        </div>
        <span className="text-xs text-white/70 font-mono">{Math.round(heading)}°</span>
        <span className="text-xs text-white/50">
          {heading < 45 || heading >= 315 ? 'N' :
           heading < 135 ? 'E' :
           heading < 225 ? 'S' : 'W'}
        </span>
      </div>
    </div>
  );
}

// ── 메인 Geospatial AR 뷰 ──
interface GeospatialARViewProps {
  playerPosition: { lat: number; lng: number };
  spawns: RamenSpawn[];
  targetRamen?: RamenSpawn | null;
  onCatch: () => void;
  onEscape?: () => void;
}

export default function GeospatialARView({
  playerPosition,
  spawns,
  targetRamen,
  onCatch,
  onEscape,
}: GeospatialARViewProps) {
  const [deviceHeading, setDeviceHeading] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // 디바이스 방위(나침반) 읽기
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      // webkitCompassHeading (iOS) 또는 alpha (Android)
      const heading = (e as any).webkitCompassHeading ?? (e.alpha ? (360 - e.alpha) % 360 : 0);
      setDeviceHeading(heading);
    };

    // iOS 13+ permission
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      (DeviceOrientationEvent as any).requestPermission()
        .then((response: string) => {
          if (response === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation, true);
          }
        });
    } else {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => window.removeEventListener('deviceorientation', handleOrientation, true);
  }, []);

  // 후면 카메라 스트림
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } catch (err) {
        console.warn('카메라 접근 실패 (데스크톱에서는 정상):', err);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // 표시할 라면 결정 (target이 있으면 그것만, 없으면 근처 전부)
  const visibleRamens = useMemo(() => {
    if (targetRamen) return [targetRamen];
    return spawns.filter(r => {
      const dist = getDistanceMeters(playerPosition.lat, playerPosition.lng, r.lat, r.lng);
      return dist <= 200; // 200m 이내만 표시
    });
  }, [spawns, targetRamen, playerPosition]);

  return (
    <div className="absolute inset-0 w-full h-full z-10">
      {/* 카메라 배경 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* 카메라 미지원 시 그라데이션 배경 */}
      {!cameraActive && (
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400 via-sky-300 to-green-300" />
      )}

      {/* 나침반 HUD */}
      <CompassHUD heading={deviceHeading} />

      {/* 상단 AR 모드 표시 */}
      <div className="absolute top-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="bg-black/70 backdrop-blur-md border border-cyan-500/50 rounded-full px-4 py-2 flex items-center gap-2">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          <span className="text-xs font-bold text-white">Geospatial AR — VPS 시뮬레이션</span>
        </div>
      </div>

      {/* 3D AR 캔버스 (Three.js) */}
      <Canvas
        camera={{ position: [0, 0, 0], fov: 75 }}
        style={{ position: 'absolute', inset: 0, zIndex: 10 }}
        gl={{ alpha: true }}
      >
        <ambientLight intensity={0.9} />
        <pointLight position={[10, 10, 10]} intensity={1.2} />
        <pointLight position={[-5, 5, -5]} intensity={0.4} color="#f59e0b" />

        <CompassCamera />

        {visibleRamens.map((ramen) => (
          <GeoRamen
            key={ramen.id}
            ramen={ramen}
            playerLat={playerPosition.lat}
            playerLng={playerPosition.lng}
            deviceHeading={deviceHeading}
            onCatch={onCatch}
          />
        ))}
      </Canvas>

      {/* 에임 십자선 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
        <div className="w-16 h-16 border-2 border-cyan-400/40 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.8)]" />
        </div>
        {/* 십자선 가이드 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-3 bg-cyan-400/30" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1px] h-3 bg-cyan-400/30" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-[1px] bg-cyan-400/30" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-[1px] bg-cyan-400/30" />
      </div>

      {/* 하단 정보 / 탈출 */}
      <div className="absolute bottom-12 z-50 flex flex-col items-center w-full px-4">
        <div className="bg-black/60 backdrop-blur border border-cyan-500/30 text-white text-xs px-4 py-2 rounded-full font-bold mb-3 shadow-lg">
          {targetRamen
            ? `${targetRamen.emoji} ${targetRamen.name} — 터치하여 포획!`
            : `🛰️ ${visibleRamens.length}개 AR 오브젝트 감지됨 (200m 반경)`}
        </div>

        {/* GPS 좌표 표시 */}
        <div className="bg-black/40 backdrop-blur-sm text-white/50 text-[10px] px-3 py-1 rounded-full font-mono mb-3">
          {playerPosition.lat.toFixed(6)}, {playerPosition.lng.toFixed(6)}
        </div>

        {onEscape && (
          <button
            onClick={onEscape}
            className="px-6 py-2 bg-white/10 backdrop-blur border border-white/20 text-white/70 text-xs rounded-full font-bold hover:bg-white/20 transition-colors"
          >
            🗺️ 지도로 돌아가기
          </button>
        )}
      </div>
    </div>
  );
}
