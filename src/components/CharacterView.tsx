"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface CharacterViewProps {
  score: number;
  level: number;
}

export default function CharacterView({ score, level }: CharacterViewProps) {
  // 한자 학습량에 따라 여의주 개수 결정 (0개~5개)
  const currentScore = typeof score === 'number' ? score : 0;
  const beadCount = Math.min(Math.floor(currentScore / 5), 5);

  return (
    <div className="relative w-full aspect-square max-w-sm mx-auto flex items-center justify-center">
      {/* Dynamic Power Glow based on beadCount */}
      <motion.div
        animate={{ 
          scale: [1, 1.1 + (beadCount * 0.05), 1],
          opacity: [0.2, 0.4 + (beadCount * 0.1), 0.2]
        }}
        transition={{ duration: 4, repeat: Infinity }}
        className={cn(
          "absolute w-64 h-64 rounded-full blur-[80px] transition-colors duration-1000",
          beadCount === 0 ? "bg-blue-400" : 
          beadCount < 3 ? "bg-cyan-400" : "bg-amber-400"
        )}
      />

      {/* Main Character: Yongchi (Premium Version) */}
      <div className="relative w-full h-full p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={beadCount}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="relative w-full h-full flex items-center justify-center"
          >
            <Image
              src="/images/yongchi_premium.png"
              alt="용치"
              fill
              className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
              priority
            />
            
            {/* Visual indicator for beadCount power */}
            {beadCount > 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {Array.from({ length: beadCount }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      y: [0, -20, 0],
                      opacity: [0, 1, 0],
                      scale: [0.5, 1, 0.5]
                    }}
                    transition={{ 
                      duration: 2 + Math.random(), 
                      repeat: Infinity, 
                      delay: i * 0.4 
                    }}
                    className="absolute"
                    style={{ 
                      left: `${30 + (i * 10)}%`, 
                      top: `${20 + (Math.random() * 20)}%` 
                    }}
                  >
                    <Sparkles className="w-6 h-6 text-amber-300 fill-amber-300" />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Level Info Badge */}
      <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-3xl border-2 border-duo-snow shadow-xl z-10">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 bg-duo-macaw rounded-full animate-pulse" />
          <p className="text-[10px] font-black text-duo-macaw uppercase tracking-widest">Lv.{level} 탐험가</p>
        </div>
        <p className="text-sm font-black text-duo-eel">용치의 여의주: {beadCount}개</p>
      </div>
    </div>
  );
}
