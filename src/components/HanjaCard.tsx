"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import HanziWriter from "hanzi-writer";
import { Trophy, Edit3, Sparkles } from "lucide-react";
import { updateLearningProgress } from "../app/actions";

interface HanjaData {
  char: string;
  meaning: string;
  sound: string;
  level: string;
  examples?: { word: string; hanja: string }[];
}

export default function HanjaCard({ 
  data, 
  word,
  delay = 0,
  onQuiz,
  onWrite,
  onProgressUpdate
}: { 
  data: HanjaData; 
  word?: string;
  delay?: number;
  onQuiz?: (hanja: string) => void;
  onWrite?: (char: string, meaning: string, sound: string) => void;
  onProgressUpdate?: () => void;
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const writerRef = useRef<HTMLDivElement>(null);
  const [writerInstance, setWriterInstance] = useState<HanziWriter | null>(null);

  useEffect(() => {
    if (isFlipped && writerRef.current && !writerInstance) {
      const writer = HanziWriter.create(writerRef.current, data.char, {
        width: 120, // 크기 확대
        height: 120,
        padding: 5,
        strokeColor: "#4b4b4b",
        radicalColor: "#58cc02",
        delayBetweenStrokes: 10,
      });
      setWriterInstance(writer);
      
      if (word) {
        updateLearningProgress(word, 'stroke').then(() => {
          onProgressUpdate?.();
        });
      }
    }
  }, [isFlipped, data.char, writerInstance, word, onProgressUpdate]);

  const handleFlip = () => setIsFlipped(!isFlipped);

  const handleWriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (word) {
      updateLearningProgress(word, 'writing').then(() => {
        onProgressUpdate?.();
      });
    }
    onWrite?.(data.char, data.meaning, data.sound);
  };

  return (
    <div className="relative w-full aspect-[4/5] min-h-[280px] perspective-1000 cursor-pointer touch-none" onClick={handleFlip}>
      <motion.div
        className="w-full h-full relative preserve-3d"
        initial={{ y: 20, opacity: 0 }}
        animate={{ rotateY: isFlipped ? 180 : 0, y: 0, opacity: 1 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20, delay: isFlipped ? 0 : delay }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Front */}
        <div className="absolute w-full h-full backface-hidden bg-white border-[3px] border-duo-snow rounded-3xl shadow-[0_6px_0_0_#e5e5e5] flex flex-col items-center justify-center p-4 text-center">
          <div className="text-6xl sm:text-7xl font-black text-duo-eel mb-2 drop-shadow-sm">{data.char}</div>
          <div className="text-lg sm:text-xl font-black text-duo-wolf leading-tight">
            {data.meaning}<br />{data.sound}
          </div>
          <div className="absolute top-4 right-4 bg-duo-snow text-duo-wolf text-xs font-black px-3 py-1.5 rounded-xl border border-duo-swan/30">
            {data.level}
          </div>
        </div>

        {/* Back */}
        <div 
          className="absolute w-full h-full backface-hidden bg-white border-[3px] border-duo-snow rounded-3xl shadow-[0_6px_0_0_#e5e5e5] flex flex-col items-center justify-between p-6"
          style={{ transform: "rotateY(180deg)" }}
        >
          <div className="flex flex-col items-center w-full">
            <div ref={writerRef} className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] mb-3 touch-none"></div>
            
            {/* Example Words List */}
            {data.examples && data.examples.length > 0 && (
              <div className="w-full mt-1 border-t-2 border-duo-snow pt-3">
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <Sparkles className="w-3 h-3 text-duo-bee" />
                  <p className="text-xs font-black text-duo-wolf uppercase tracking-tighter">활용 단어</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  {data.examples.slice(0, 3).map((ex, i) => (
                    <div key={i} className="flex justify-between items-center bg-duo-snow/40 px-3 py-1.5 rounded-xl text-xs font-bold border border-duo-snow">
                      <span className="text-duo-eel">{ex.word}</span>
                      <span className="text-duo-swan text-[11px] font-black">{ex.hanja}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 w-full mt-4">
            <button 
              onClick={handleWriteClick}
              className="flex-1 flex items-center justify-center gap-2 bg-duo-snow text-duo-eel h-12 rounded-2xl font-black text-sm border-2 border-duo-swan hover:bg-duo-swan transition-all"
            >
              <Edit3 className="w-4 h-4" /> 써보기
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onQuiz?.(data.char);
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-duo-bee text-white h-12 rounded-2xl font-black text-sm shadow-[0_4px_0_0_#e5a500] hover:translate-y-[1px] hover:shadow-[0_2px_0_0_#e5a500] active:translate-y-[2px] active:shadow-none transition-all"
            >
              <Trophy className="w-4 h-4" /> 퀴즈
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
