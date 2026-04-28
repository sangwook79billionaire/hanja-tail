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
        width: 100,
        height: 100,
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
        <div className="absolute w-full h-full backface-hidden bg-white border-2 border-duo-swan rounded-2xl shadow-[0_4px_0_0_#e5e5e5] flex flex-col items-center justify-center p-2 text-center">
          <div className="text-4xl sm:text-5xl font-black text-duo-eel mb-1 drop-shadow-sm">{data.char}</div>
          <div className="text-[13px] sm:text-base font-bold text-duo-wolf leading-tight">
            {data.meaning}<br />{data.sound}
          </div>
          <div className="absolute top-2 right-2 bg-duo-snow text-duo-wolf text-[9px] font-bold px-1.5 py-0.5 rounded">
            {data.level}
          </div>
        </div>

        {/* Back */}
        <div 
          className="absolute w-full h-full backface-hidden bg-white border-2 border-duo-swan rounded-2xl shadow-[0_4px_0_0_#e5e5e5] flex flex-col items-center justify-center p-2"
          style={{ transform: "rotateY(180deg)" }}
        >
          <div ref={writerRef} className="w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] mb-2 touch-none scale-90 sm:scale-100"></div>
          <div className="flex flex-col sm:flex-row gap-1 w-full px-2">
            <button 
              onClick={playAnimation}
              className="flex-1 flex items-center justify-center gap-1 bg-duo-snow text-duo-eel py-1.5 rounded-lg font-bold text-[10px] sm:text-xs border-2 border-duo-swan hover:bg-duo-swan transition-all"
            >
              <Play className="w-2.5 h-2.5 fill-current" /> 써보기
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onQuiz?.(data.char);
              }}
              className="flex-1 flex items-center justify-center gap-1 bg-duo-bee text-white py-1.5 rounded-lg font-bold text-[10px] sm:text-xs shadow-[0_2px_0_0_#e5a500] hover:translate-y-[1px] hover:shadow-[0_1px_0_0_#e5a500] active:translate-y-[2px] active:shadow-none transition-all"
            >
              <Trophy className="w-2.5 h-2.5" /> 퀴즈
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
