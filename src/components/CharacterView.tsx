"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Sparkles } from "lucide-react";

interface CharacterViewProps {
  score: number;
  level: number;
}

export default function CharacterView({ score, level }: CharacterViewProps) {
  // 한자 학습량에 따라 여의주 개수 결정 (0개~5개)
  const currentScore = typeof score === 'number' ? score : 0;
  const beadCount = Math.min(Math.floor(currentScore / 5), 5);

  return (
    <div className="relative w-full aspect-square max-w-sm mx-auto bg-gradient-to-b from-blue-50 to-white rounded-[40px] border-4 border-duo-snow shadow-sm overflow-hidden p-4">
      {/* Background Sparkles */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute top-10 left-10"
        >
          <Sparkles className="w-8 h-8 text-duo-macaw" />
        </motion.div>
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.6, 0.3, 0.6] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1 }}
          className="absolute bottom-10 right-10"
        >
          <Sparkles className="w-10 h-10 text-duo-bee" />
        </motion.div>
      </div>

      {/* Main Character: Yongchi (Dynamic Image based on beads) */}
      <div className="relative w-full h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={beadCount}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5 }}
            className="relative w-full h-full"
          >
            <Image
              src={`/images/yongchi_${beadCount}.png`}
              alt={`용치 (여의주 ${beadCount}개)`}
              fill
              className="object-contain"
              priority
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Level Info Badge */}
      <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl border-2 border-duo-snow shadow-sm">
        <p className="text-[10px] font-black text-duo-macaw uppercase tracking-widest">Lv.{level} 탐험가</p>
        <p className="text-sm font-black text-duo-eel">용치의 여의주: {beadCount}개</p>
      </div>
    </div>
  );
}
