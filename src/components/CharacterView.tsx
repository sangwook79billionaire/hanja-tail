"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Sparkles } from "lucide-react";

interface CharacterViewProps {
  score: number;
  level: number;
}

export default function CharacterView({ score, level }: CharacterViewProps) {
  // 한자 학습량에 따라 여의주 개수 결정 (예: 5점마다 1개씩, 최대 6개)
  const beadCount = Math.min(Math.floor(score / 5) + 1, 6);

  // 꼬리 위치에 맞춰서 여의주 좌표 설정 (이미지 비율에 따라 조정 필요)
  const beadPositions = [
    { bottom: "18%", right: "32%" }, // 1st bead (base)
    { bottom: "22%", right: "25%" }, // 2nd
    { bottom: "30%", right: "19%" }, // 3rd
    { bottom: "40%", right: "15%" }, // 4th
    { bottom: "52%", right: "14%" }, // 5th
    { bottom: "65%", right: "16%" }, // 6th (tip)
  ];

  return (
    <div className="relative w-full aspect-video max-w-sm mx-auto bg-gradient-to-b from-blue-50 to-white rounded-[40px] border-4 border-duo-snow shadow-sm overflow-hidden p-4">
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

      {/* Main Character: Yongchi */}
      <div className="relative w-full h-full">
        <Image
          src="/images/yongchi.png"
          alt="용치"
          fill
          className="object-contain"
          priority
        />

        {/* Dynamic Beads (Yeouiju) */}
        <AnimatePresence>
          {beadPositions.slice(0, beadCount).map((pos, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.2, type: "spring" }}
              className="absolute w-6 h-6 sm:w-8 sm:h-8 rounded-full z-10"
              style={{ 
                bottom: pos.bottom, 
                right: pos.right,
                background: "radial-gradient(circle at 30% 30%, #a5f3fc, #22d3ee)",
                boxShadow: "0 0 15px #22d3ee, inset -2px -2px 5px rgba(0,0,0,0.2)"
              }}
            >
              <motion.div
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                className="absolute inset-0 rounded-full bg-white blur-[2px]"
                style={{ scale: 0.6 }}
              />
            </motion.div>
          ))}
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
