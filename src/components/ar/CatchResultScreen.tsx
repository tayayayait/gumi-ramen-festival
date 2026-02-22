// ============================================================
// CatchResultScreen — 포획 성공/실패 결과 화면
// 포켓몬GO의 "잡았다!" / "도망갔다..." 결과 화면 구현
// ============================================================

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RamenSpawn, getRarityStyle } from '@/data/ramenSpawns';
import { Gift, MapPin, Share2, Frown } from 'lucide-react';

interface CatchResultScreenProps {
  ramen: RamenSpawn;
  outcome: 'success' | 'escaped';
  stickerCount: number;
  onReturn: () => void;
}

export default function CatchResultScreen({
  ramen,
  outcome,
  stickerCount,
  onReturn,
}: CatchResultScreenProps) {
  const isSuccess = outcome === 'success';
  const style = getRarityStyle(ramen.rarity);

  // 5개 모은 경우
  const isFiveComplete = isSuccess && stickerCount === 0;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.5, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="w-full max-w-sm mx-4"
      >
        {isSuccess ? (
          /* ── 포획 성공 ── */
          <div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-black/80 to-accent-blue/20 backdrop-blur-md rounded-3xl border-2 border-accent-orange/50 shadow-[0_0_40px_rgba(255,165,0,0.3)] text-center">
            {/* 라면 이모지 + 텍스트 */}
            <motion.div
              initial={{ scale: 0, rotate: -360 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="text-7xl mx-auto"
            >
              {ramen.emoji}
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="text-2xl font-black text-white">
                {isFiveComplete ? '🎉 축하합니다!' : '잡았다!'}
              </h3>
              <p className="text-white/70 text-sm mt-1">
                {ramen.name}을(를) 포획했습니다!
              </p>
            </motion.div>

            {/* 획득물 표시 */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col gap-2"
            >
              <div className="flex justify-between items-center px-4 py-3 bg-black/60 rounded-xl border border-white/10">
                <span className="text-white/80 text-sm font-bold">스티커</span>
                <Badge className={`${style.bg} ${style.text} border ${style.border} text-base`}>
                  {stickerCount}/5
                </Badge>
              </div>

              <div className={`flex justify-between items-center px-4 py-3 bg-black/60 rounded-xl border ${style.border}`}>
                <span className="text-white/80 text-sm font-bold">희귀도</span>
                <span className={`text-sm font-black uppercase ${style.text}`}>
                  {ramen.rarity === 'common' ? '★ Common' : ramen.rarity === 'rare' ? '★★ Rare' : '★★★ Legendary'}
                </span>
              </div>
            </motion.div>

            {/* 5개 달성 시 보너스 */}
            {isFiveComplete && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.8 }}
                className="p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/50"
              >
                <Gift className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
                <p className="text-yellow-300 font-bold text-sm">
                  한정판 굿즈 교환권이 지급되었습니다!
                </p>
              </motion.div>
            )}

            {/* 버튼 */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.0 }}
              className="flex flex-col gap-2 mt-2"
            >
              <Button
                className="w-full h-12 bg-accent-blue hover:bg-cyan-500 text-black font-bold rounded-xl gap-2"
              >
                <Share2 className="w-4 h-4" />
                자랑하기
              </Button>
              <Button
                variant="outline"
                onClick={onReturn}
                className="w-full h-12 border-white/20 text-white hover:bg-white/10 rounded-xl gap-2"
              >
                <MapPin className="w-4 h-4" />
                지도로 돌아가기
              </Button>
            </motion.div>
          </div>
        ) : (
          /* ── 포획 실패 (도망침) ── */
          <div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-black/80 to-red-900/20 backdrop-blur-md rounded-3xl border-2 border-red-500/30 text-center">
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="text-6xl mx-auto opacity-40"
            >
              {ramen.emoji}
            </motion.div>

            <Frown className="w-12 h-12 text-red-400 mx-auto" />

            <h3 className="text-2xl font-black text-white">도망갔다...</h3>
            <p className="text-white/60 text-sm">
              {ramen.name}이(가) 식어서 사라졌습니다.
              <br />다음에 다시 도전하세요!
            </p>

            <Button
              variant="outline"
              onClick={onReturn}
              className="w-full h-12 border-white/20 text-white hover:bg-white/10 rounded-xl gap-2 mt-2"
            >
              <MapPin className="w-4 h-4" />
              지도로 돌아가기
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
