// ============================================================
// ARCanvas — 포켓몬GO 스타일 AR 포획 화면 (개선 버전)
// 인카운터된 1개의 라면만 표시, 바닥 앵커링, 스와이프 포획
// ============================================================

import { useRef, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Sphere, Torus, Cone } from '@react-three/drei';
import * as THREE from 'three';
import { RamenSpawn } from '@/data/ramenSpawns';
import { checkWebXRSupport } from './GeospatialARView';

// Geospatial AR 뷰 lazy 로딩
const GeospatialARView = lazy(() => import('./GeospatialARView'));

// ── 모바일 자이로 카메라 제어 ──
function OrientationControls() {
  const { camera } = useThree();

  useEffect(() => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (isTouchDevice && window.DeviceOrientationEvent) {
      const handleOrientation = (e: DeviceOrientationEvent) => {
        const beta = e.beta ? e.beta * (Math.PI / 180) : 0;
        const gamma = e.gamma ? e.gamma * (Math.PI / 180) : 0;

        camera.rotation.set(
          THREE.MathUtils.lerp(camera.rotation.x, beta - Math.PI / 2, 0.1),
          THREE.MathUtils.lerp(camera.rotation.y, -gamma, 0.1),
          0
        );
      };

      window.addEventListener('deviceorientation', handleOrientation);
      return () => window.removeEventListener('deviceorientation', handleOrientation);
    } else {
      const handleMouseMove = (e: MouseEvent) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -(e.clientY / window.innerHeight) * 2 + 1;

        camera.rotation.set(
          THREE.MathUtils.lerp(camera.rotation.x, y * 0.3, 0.1),
          THREE.MathUtils.lerp(camera.rotation.y, -x * 0.3, 0.1),
          0
        );
      };
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [camera]);

  return null;
}

// ── 3D 라면 그릇 (바닥 앵커링 버전) ──
interface AnchoredRamenProps {
  ramen: RamenSpawn;
  awareness: number; // 0~100 경계심
  onCatch: () => void;
}

function AnchoredRamen({ ramen, awareness, onCatch }: AnchoredRamenProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHover] = useState(false);

  // 회전 + 경계심에 따른 떨림 애니메이션
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;

      // 경계심이 높으면 떨림
      if (awareness > 70) {
        meshRef.current.position.x = Math.sin(state.clock.elapsedTime * 15) * 0.03;
      }
    }
  });

  // 라면 색상 (종류에 따라)
  const bowlColor = ramen.color || '#e23e3e';

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
      <group
        ref={meshRef}
        position={[0, -0.5, -3]} // 바닥 앵커링 (화면 하단 중앙)
        onClick={(e) => {
          e.stopPropagation();
          onCatch();
        }}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
        scale={hovered ? 1.15 : 1}
      >
        {/* 그릇 (반구) */}
        <Sphere
          args={[1.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]}
          rotation={[Math.PI, 0, 0]}
        >
          <meshStandardMaterial color={bowlColor} roughness={0.3} metalness={0.1} />
        </Sphere>

        {/* 국물 표면 */}
        <Torus args={[1.05, 0.12, 16, 100]} position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#f59e0b" roughness={0.5} />
        </Torus>

        {/* 면발 */}
        <Cone args={[0.8, 0.6, 16]} position={[0, 0.25, 0]}>
          <meshStandardMaterial color="#fef08a" roughness={0.6} />
        </Cone>

        {/* 김(steam) 파티클 시뮬레이션 */}
        {[...Array(3)].map((_, i) => (
          <SteamParticle key={i} delay={i * 0.5} />
        ))}

        {/* 호버 시 포획 힌트 */}
        {hovered && (
          <mesh position={[0, 1.8, 0]}>
            <planeGeometry args={[2.5, 0.5]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.6} />
          </mesh>
        )}
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
      meshRef.current.position.y = 0.5 + t * 2;
      meshRef.current.scale.setScalar(0.1 + t * 0.3);
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.4 * (1 - t);
    }
  });

  return (
    <mesh ref={meshRef} position={[(Math.random() - 0.5) * 0.5, 0.5, (Math.random() - 0.5) * 0.3]}>
      <sphereGeometry args={[0.15, 8, 8]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
    </mesh>
  );
}

// ── 경계심 미터 UI ──
function AwarenessMeter({ value }: { value: number }) {
  const color = value < 40 ? '#22c55e' : value < 70 ? '#eab308' : '#ef4444';
  const label = value < 40 ? '안심' : value < 70 ? '경계' : '위험!';

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-3">
        <span className="text-xs text-white/60 font-bold">{label}</span>
        <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${value}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </div>
  );
}

// ── 메인 AR 캔버스 (개선 버전) ──
interface ARCanvasProps {
  ramen?: RamenSpawn | null; // 선택된 라면 (null 이면 레거시 모드)
  onCatch: () => void;
  onEscape?: () => void;
  playerPosition?: { lat: number; lng: number } | null;
  spawns?: RamenSpawn[];
  useGeospatial?: boolean; // true이면 Geospatial AR 모드 강제
}

export function ARCanvas({ ramen, onCatch, onEscape, playerPosition, spawns = [], useGeospatial }: ARCanvasProps) {
  const [awareness, setAwareness] = useState(0);
  const awarenessRef = useRef(0);
  const touchCountRef = useRef(0);
  const [webXRSupported, setWebXRSupported] = useState<boolean | null>(null);

  // WebXR 지원 감지
  useEffect(() => {
    checkWebXRSupport().then(setWebXRSupported);
  }, []);

  // Geospatial AR 모드 (WebXR 지원 + GPS 있음, 또는 useGeospatial 강제)
  const shouldUseGeospatial = (useGeospatial || webXRSupported) && playerPosition;

  if (shouldUseGeospatial && playerPosition) {
    return (
      <Suspense fallback={
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-bold">Geospatial AR 로딩 중...</p>
          </div>
        </div>
      }>
        <GeospatialARView
          playerPosition={playerPosition}
          spawns={spawns}
          targetRamen={ramen}
          onCatch={onCatch}
          onEscape={onEscape}
        />
      </Suspense>
    );
  }

  // 경계심 시스템: 화면을 많이 터치하면 라면이 식어서 도망감
  const handleInteraction = useCallback(() => {
    touchCountRef.current += 1;
    const newAwareness = Math.min(100, awarenessRef.current + 8);
    awarenessRef.current = newAwareness;
    setAwareness(newAwareness);

    // 100% 도달 시 도망
    if (newAwareness >= 100 && onEscape) {
      setTimeout(() => onEscape(), 500);
    }
  }, [onEscape]);

  // 경계심 자연 감소 (3초마다 -5)
  useEffect(() => {
    const interval = setInterval(() => {
      const newVal = Math.max(0, awarenessRef.current - 5);
      awarenessRef.current = newVal;
      setAwareness(newVal);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // 포획 시도 핸들러
  const handleCatchAttempt = useCallback(() => {
    if (!ramen) {
      onCatch();
      return;
    }

    // 난이도 기반 포획 확률
    const baseChance = 1 - ramen.catchDifficulty * 0.08; // difficulty 1=92%, 10=20%
    const awarenessBonus = awareness < 30 ? 0.1 : 0; // 경계심 낮으면 보너스
    const chance = Math.min(0.95, baseChance + awarenessBonus);

    if (Math.random() < chance) {
      onCatch();
    } else {
      // 실패 시 경계심 증가
      handleInteraction();
    }
  }, [ramen, awareness, onCatch, handleInteraction]);

  return (
    <div
      className="absolute inset-0 w-full h-full pointer-events-auto z-10"
      onTouchStart={handleInteraction}
    >
      {/* 경계심 미터 */}
      <AwarenessMeter value={awareness} />

      {/* 3D 캔버스 */}
      <Canvas camera={{ position: [0, 0, 0], fov: 75 }}>
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <pointLight position={[-5, 5, -5]} intensity={0.5} color="#f59e0b" />

        <OrientationControls />

        {ramen ? (
          <AnchoredRamen
            ramen={ramen}
            awareness={awareness}
            onCatch={handleCatchAttempt}
          />
        ) : (
          // 레거시 호환 (ramen prop 없을 경우)
          <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
            <group position={[0, 0, -5]} onClick={handleCatchAttempt}>
              <Sphere args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} rotation={[Math.PI, 0, 0]}>
                <meshStandardMaterial color="#e23e3e" />
              </Sphere>
              <Torus args={[0.9, 0.1, 16, 100]} position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <meshStandardMaterial color="#f59e0b" />
              </Torus>
              <Cone args={[0.7, 0.5, 16]} position={[0, 0.2, 0]}>
                <meshStandardMaterial color="#fef08a" />
              </Cone>
            </group>
          </Float>
        )}
      </Canvas>

      {/* 에임 십자선 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="w-12 h-12 border-2 border-white/30 rounded-full flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_#fff]" />
        </div>
      </div>

      {/* 하단 포획 버튼 / 도움말 */}
      <div className="absolute bottom-12 z-[50] flex flex-col items-center w-full px-4">
        <div className="bg-black/50 backdrop-blur border border-white/20 text-white text-xs px-4 py-2 rounded-full font-bold mb-4 shadow-lg animate-pulse">
          {ramen ? `${ramen.emoji} ${ramen.name}을(를) 터치하여 포획하세요!` : '화면의 그릇을 터치하세요!'}
        </div>

        {/* 탈출 버튼 */}
        {onEscape && (
          <button
            onClick={onEscape}
            className="mt-2 px-6 py-2 bg-white/10 backdrop-blur border border-white/20 text-white/70 text-xs rounded-full font-bold hover:bg-white/20 transition-colors"
          >
            🏃 도망가기
          </button>
        )}
      </div>
    </div>
  );
}
