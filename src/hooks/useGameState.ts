// ============================================================
// 게임 상태 관리 (FSM — Finite State Machine)
// 포켓몬GO의 MAP → ENCOUNTER → CATCH → RESULT 루프 구현
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { RamenSpawn, CaughtRamen, generateSpawns } from '@/data/ramenSpawns';

/** 게임 상태 */
export type GameState =
  | 'MAP_VIEW'
  | 'ENCOUNTER_TRANSITION'
  | 'AR_CATCH'
  | 'CATCH_RESULT';

/** 포획 결과 */
export type CatchOutcome = 'success' | 'escaped' | null;

/** 게임 상태 훅 반환 타입 */
export interface GameStore {
  // 상태
  state: GameState;
  selectedRamen: RamenSpawn | null;
  spawns: RamenSpawn[];
  inventory: CaughtRamen[];
  stickerCount: number;
  catchOutcome: CatchOutcome;
  playerPosition: { lat: number; lng: number } | null;

  // 액션
  startEncounter: (ramen: RamenSpawn) => void;
  enterARCatch: () => void;
  catchSuccess: () => void;
  catchFail: () => void;
  returnToMap: () => void;
  respawnRamen: () => void;
}

// 기본 GPS 좌표 (구미/원평 기준 — 실사용 시 동적 변경)
const DEFAULT_CENTER = { lat: 36.1194, lng: 128.3443 };

/** 로컬 스토리지 키 */
const STICKER_KEY = 'ramen_sticker_count';
const INVENTORY_KEY = 'ramen_inventory';

export function useGameState(): GameStore {
  // 게임 FSM 상태
  const [state, setState] = useState<GameState>('MAP_VIEW');
  const [selectedRamen, setSelectedRamen] = useState<RamenSpawn | null>(null);
  const [catchOutcome, setCatchOutcome] = useState<CatchOutcome>(null);

  // 라면 스폰 목록
  const [spawns, setSpawns] = useState<RamenSpawn[]>([]);

  // 인벤토리 & 스코어
  const [inventory, setInventory] = useState<CaughtRamen[]>(() => {
    try {
      const saved = localStorage.getItem(INVENTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [stickerCount, setStickerCount] = useState(() => {
    const saved = localStorage.getItem(STICKER_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });

  // 플레이어 GPS 위치
  const [playerPosition, setPlayerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // ── GPS 위치 추적 ──
  useEffect(() => {
    if (!navigator.geolocation) {
      // GPS 없으면 기본 좌표 사용
      setPlayerPosition(DEFAULT_CENTER);
      return;
    }

    // 현재 위치 즉시 가져오기
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPlayerPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setPlayerPosition(DEFAULT_CENTER);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // 위치 실시간 추적
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPlayerPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => { /* 에러 무시 — 이전 위치 유지 */ },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // ── 최초 스폰 생성 ──
  useEffect(() => {
    if (playerPosition && spawns.length === 0) {
      setSpawns(generateSpawns(playerPosition.lat, playerPosition.lng));
    }
  }, [playerPosition, spawns.length]);

  // ── 인벤토리 로컬 저장 ──
  useEffect(() => {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem(STICKER_KEY, stickerCount.toString());
  }, [stickerCount]);

  // ── 액션들 ──

  /** 지도에서 라면 터치 → 인카운터 전환 시작 */
  const startEncounter = useCallback((ramen: RamenSpawn) => {
    setSelectedRamen(ramen);
    setCatchOutcome(null);
    setState('ENCOUNTER_TRANSITION');
  }, []);

  /** 전환 애니메이션 완료 → AR 포획 화면 진입 */
  const enterARCatch = useCallback(() => {
    setState('AR_CATCH');
  }, []);

  /** 포획 성공 */
  const catchSuccess = useCallback(() => {
    if (selectedRamen) {
      // 인벤토리에 추가
      setInventory(prev => [...prev, { ramen: selectedRamen, caughtAt: new Date() }]);

      // 스포너에서 제거
      setSpawns(prev => prev.filter(s => s.id !== selectedRamen.id));

      // 스티커 카운트
      const newCount = (stickerCount + 1) % 6;
      setStickerCount(newCount === 0 ? 0 : newCount);
    }
    setCatchOutcome('success');
    setState('CATCH_RESULT');
  }, [selectedRamen, stickerCount]);

  /** 포획 실패 (도망침) */
  const catchFail = useCallback(() => {
    if (selectedRamen) {
      // 스포너에서 제거 (도망감)
      setSpawns(prev => prev.filter(s => s.id !== selectedRamen.id));
    }
    setCatchOutcome('escaped');
    setState('CATCH_RESULT');
  }, [selectedRamen]);

  /** 결과 확인 후 지도로 복귀 */
  const returnToMap = useCallback(() => {
    setSelectedRamen(null);
    setCatchOutcome(null);
    setState('MAP_VIEW');
  }, []);

  /** 시간 경과 후 새 라면 스폰 */
  const respawnRamen = useCallback(() => {
    if (playerPosition) {
      const newSpawns = generateSpawns(playerPosition.lat, playerPosition.lng, 0.003, 2);
      setSpawns(prev => [...prev, ...newSpawns]);
    }
  }, [playerPosition]);

  return {
    state,
    selectedRamen,
    spawns,
    inventory,
    stickerCount,
    catchOutcome,
    playerPosition,
    startEncounter,
    enterARCatch,
    catchSuccess,
    catchFail,
    returnToMap,
    respawnRamen,
  };
}
