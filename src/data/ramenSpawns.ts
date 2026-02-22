// ============================================================
// 라면 스폰 데이터 & 타입 정의
// 포켓몬GO의 몬스터 스폰 시스템을 라면 테마로 구현
// ============================================================

/** 라면 종류 */
export type RamenType = 'miso' | 'tonkotsu' | 'shoyu' | 'tantan' | 'special';

/** 희귀도 */
export type Rarity = 'common' | 'rare' | 'legendary';

/** 라면 스폰 오브젝트 */
export interface RamenSpawn {
  id: string;
  name: string;
  type: RamenType;
  rarity: Rarity;
  lat: number;
  lng: number;
  catchDifficulty: number; // 1~10
  description: string;
  emoji: string;
  color: string; // 3D 메쉬의 주 색상
}

/** 포획된 라면 */
export interface CaughtRamen {
  ramen: RamenSpawn;
  caughtAt: Date;
}

// 라면 메타데이터 (종류별 기본 속성)
export const RAMEN_META: Record<RamenType, { name: string; emoji: string; color: string; rarity: Rarity; difficulty: number }> = {
  miso: { name: '미소라멘', emoji: '🍜', color: '#f59e0b', rarity: 'common', difficulty: 2 },
  tonkotsu: { name: '돈코츠라멘', emoji: '🍥', color: '#fef3c7', rarity: 'common', difficulty: 3 },
  shoyu: { name: '쇼유라멘', emoji: '🥢', color: '#92400e', rarity: 'rare', difficulty: 5 },
  tantan: { name: '탄탄멘', emoji: '🌶️', color: '#dc2626', rarity: 'rare', difficulty: 6 },
  special: { name: '한정판 라멘', emoji: '⭐', color: '#8b5cf6', rarity: 'legendary', difficulty: 9 },
};

/**
 * 가맹점 GPS 좌표 기반으로 라면을 스폰하는 함수
 * 실 서비스에서는 Supabase shops 테이블에서 가져온 좌표 사용
 */
export function generateSpawns(
  centerLat: number,
  centerLng: number,
  radius: number = 0.003, // 약 300m 반경
  count: number = 6
): RamenSpawn[] {
  const types: RamenType[] = ['miso', 'tonkotsu', 'shoyu', 'tantan', 'special'];
  const spawns: RamenSpawn[] = [];

  for (let i = 0; i < count; i++) {
    // 랜덤 위치 (중심점 기반 반경 내)
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius;
    const lat = centerLat + dist * Math.cos(angle);
    const lng = centerLng + dist * Math.sin(angle);

    // 희귀도에 따른 가중치 랜덤 선택
    const roll = Math.random();
    let type: RamenType;
    if (roll < 0.35) type = 'miso';
    else if (roll < 0.65) type = 'tonkotsu';
    else if (roll < 0.82) type = 'shoyu';
    else if (roll < 0.95) type = 'tantan';
    else type = 'special';

    const meta = RAMEN_META[type];

    spawns.push({
      id: `ramen-${Date.now()}-${i}`,
      name: meta.name,
      type,
      rarity: meta.rarity,
      lat,
      lng,
      catchDifficulty: meta.difficulty,
      description: `야생의 ${meta.name}이(가) 나타났다!`,
      emoji: meta.emoji,
      color: meta.color,
    });
  }

  return spawns;
}

/** 두 GPS 좌표 사이의 거리 (미터) 계산 — Haversine 공식 */
export function getDistanceMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371e3; // 지구 반경 (미터)
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/** 희귀도에 따른 스타일 맵핑 */
export function getRarityStyle(rarity: Rarity) {
  switch (rarity) {
    case 'common':
      return { border: 'border-gray-400', bg: 'bg-gray-500/20', text: 'text-gray-300', glow: '' };
    case 'rare':
      return { border: 'border-blue-400', bg: 'bg-blue-500/20', text: 'text-blue-300', glow: 'shadow-[0_0_12px_rgba(59,130,246,0.5)]' };
    case 'legendary':
      return { border: 'border-yellow-400', bg: 'bg-yellow-500/20', text: 'text-yellow-300', glow: 'shadow-[0_0_20px_rgba(234,179,8,0.6)]' };
  }
}
