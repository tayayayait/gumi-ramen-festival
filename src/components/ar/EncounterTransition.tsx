// ============================================================
// EncounterTransition — 포켓몬GO의 "야생의 OO이 나타났다!" 전환 화면
// 지도 → AR 카메라로 넘어가는 중간 연출 (1.5초)
// ============================================================

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RamenSpawn, getRarityStyle } from '@/data/ramenSpawns';

interface EncounterTransitionProps {
  ramen: RamenSpawn;
  onComplete: () => void;
}

export default function EncounterTransition({ ramen, onComplete }: EncounterTransitionProps) {
  const [phase, setPhase] = useState<'flash' | 'reveal' | 'exit'>('flash');
  const style = getRarityStyle(ramen.rarity);

  useEffect(() => {
    // Phase 1: 화이트 플래시 (0.3초)
    const t1 = setTimeout(() => setPhase('reveal'), 300);
    // Phase 2: 라면 이름 표시 (1.2초)
    const t2 = setTimeout(() => setPhase('exit'), 1500);
    // Phase 3: AR 카메라로 전환
    const t3 = setTimeout(() => onComplete(), 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        {/* Phase 1: 화이트 플래시 */}
        {phase === 'flash' && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-white z-50"
          />
        )}

        {/* Phase 2: 라면 등장 연출 */}
        {phase === 'reveal' && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50"
          >
            {/* 대각선 스트라이프 배경 (포켓몬GO 인카운터 느낌) */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                background: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 20px,
                  rgba(255,165,0,0.3) 20px,
                  rgba(255,165,0,0.3) 22px
                )`,
              }}
            />

            {/* 라면 이모지 + 이름 */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              className="relative"
            >
              <div className={`text-8xl mb-6 drop-shadow-[0_0_30px_${ramen.color}] animate-bounce`}>
                {ramen.emoji}
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <p className="text-white/60 text-sm font-bold tracking-widest uppercase mb-2">
                야생의
              </p>
              <h2 className={`text-3xl font-black text-white ${style.glow} mb-2`}>
                {ramen.name}
              </h2>
              <p className="text-white/60 text-sm font-bold">
                이(가) 나타났다!
              </p>

              {/* 희귀도 뱃지 */}
              <div className={`mt-4 inline-flex items-center gap-1 px-3 py-1 rounded-full border ${style.border} ${style.bg}`}>
                <span className={`text-xs font-black uppercase ${style.text}`}>
                  {ramen.rarity === 'common' ? '★' : ramen.rarity === 'rare' ? '★★' : '★★★'} {ramen.rarity}
                </span>
              </div>
            </motion.div>

            {/* 스파클 파티클 */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-yellow-300 rounded-full"
                initial={{
                  x: 0,
                  y: 0,
                  opacity: 1,
                  scale: 0,
                }}
                animate={{
                  x: (Math.random() - 0.5) * 400,
                  y: (Math.random() - 0.5) * 400,
                  opacity: 0,
                  scale: Math.random() * 3 + 1,
                }}
                transition={{
                  duration: 0.8,
                  delay: Math.random() * 0.3,
                  ease: 'easeOut',
                }}
              />
            ))}
          </motion.div>
        )}

        {/* Phase 3: 페이드 아웃 → AR 화면 */}
        {phase === 'exit' && (
          <motion.div
            key="exit"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-black z-50"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
