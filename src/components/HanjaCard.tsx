"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import HanziWriter from "hanzi-writer";
import { Play, Trophy } from "lucide-react";

interface HanjaData {
  char: string;
  meaning: string;
  sound: string;
  level: string;
}

export default function HanjaCard({ 
  data, 
  delay = 0,
  onQuiz
}: { 
  data: HanjaData; 
  delay?: number;
  onQuiz?: (hanja: string) => void;
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const writerRef = useRef<HTMLDivElement>(null);
  const [writerInstance, setWriterInstance] = useState<HanziWriter | null>(null);

  useEffect(() => {
    if (isFlipped && writerRef.current && !writerInstance) {
      // Initialize HanziWriter when flipped for the first time
      const writer = HanziWriter.create(writerRef.current, data.char, {
        width: 120,
        height: 120,
        padding: 5,
        strokeColor: "#4b4b4b",
        radicalColor: "#58cc02",
        delayBetweenStrokes: 10,
      });
      setWriterInstance(writer);
    }
  }, [isFlipped, data.char, writerInstance]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const playAnimation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (writerInstance) {
      writerInstance.animateCharacter();
    }
  };

  return (
    <div className="relative w-full aspect-[4/5] perspective-1000 cursor-pointer touch-none" onClick={handleFlip}>
      <motion.div
        className="w-full h-full relative preserve-3d"
        initial={{ y: 20, opacity: 0 }}
        animate={{ rotateY: isFlipped ? 180 : 0, y: 0, opacity: 1 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20, delay: isFlipped ? 0 : delay }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Front */}
        <div className="absolute w-full h-full backface-hidden bg-white border-2 border-duo-swan rounded-2xl shadow-[0_4px_0_0_#e5e5e5] flex flex-col items-center justify-center p-4">
          <div className="text-6xl font-black text-duo-eel mb-2 drop-shadow-sm">{data.char}</div>
          <div className="text-lg font-bold text-duo-wolf">{data.meaning} {data.sound}</div>
          <div className="absolute top-3 right-3 bg-duo-snow text-duo-wolf text-xs font-bold px-2 py-1 rounded-md">
            {data.level}
          </div>
        </div>

        {/* Back */}
        <div 
          className="absolute w-full h-full backface-hidden bg-white border-2 border-duo-swan rounded-2xl shadow-[0_4px_0_0_#e5e5e5] flex flex-col items-center justify-center p-4"
          style={{ transform: "rotateY(180deg)" }}
        >
          <div ref={writerRef} className="w-[120px] h-[120px] mb-4 touch-none"></div>
          <div className="flex gap-2">
            <button 
              onClick={playAnimation}
              className="flex items-center gap-1 bg-duo-snow text-duo-eel px-3 py-2 rounded-xl font-bold text-xs border-2 border-duo-swan hover:bg-duo-swan transition-all"
            >
              <Play className="w-3 h-3 fill-current" /> 써보기
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onQuiz?.(data.char);
              }}
              className="flex items-center gap-1 bg-duo-bee text-white px-3 py-2 rounded-xl font-bold text-xs shadow-[0_3px_0_0_#e5a500] hover:translate-y-[1px] hover:shadow-[0_2px_0_0_#e5a500] active:translate-y-[3px] active:shadow-none transition-all"
            >
              <Trophy className="w-3 h-3" /> 퀴즈 도전!
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
