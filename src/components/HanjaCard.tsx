"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HanziWriter from "hanzi-writer";
import { Trophy, Edit3, Sparkles, X } from "lucide-react";
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const writerRef = useRef<HTMLDivElement>(null);
  const [writerInstance, setWriterInstance] = useState<HanziWriter | null>(null);

  useEffect(() => {
    if (isExpanded && isFlipped && writerRef.current && !writerInstance) {
      const writer = HanziWriter.create(writerRef.current, data.char, {
        width: 140,
        height: 140,
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
    // 모달이 닫히면 인스턴스 초기화
    if (!isExpanded) {
      setWriterInstance(null);
      setIsFlipped(false);
    }
  }, [isExpanded, isFlipped, data.char, writerInstance, word, onProgressUpdate]);

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
    <>
      {/* Mini Card View */}
      <motion.div
        layoutId={`card-${data.char}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        onClick={() => setIsExpanded(true)}
        className="relative bg-white border-2 border-duo-snow rounded-2xl p-4 shadow-[0_4px_0_0_#e5e5e5] hover:translate-y-[-2px] hover:shadow-[0_6px_0_0_#e5e5e5] transition-all cursor-pointer group flex flex-col items-center justify-center aspect-[4/5] w-full"
      >
        <div className="text-4xl font-black text-duo-eel mb-1 group-hover:scale-110 transition-transform">{data.char}</div>
        <div className="text-xs font-bold text-duo-wolf text-center leading-tight">
          {data.meaning}<br/>{data.sound}
        </div>
        <div className="absolute top-2 right-2 text-[8px] font-black bg-duo-snow px-1.5 py-0.5 rounded-md text-duo-swan">
          {data.level}
        </div>
      </motion.div>

      {/* Expanded Detailed View (Modal) */}
      <AnimatePresence>
        {isExpanded && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpanded(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            
            <motion.div
              layoutId={`card-${data.char}`}
              className="relative w-full max-w-sm aspect-[4/5] perspective-1000"
              style={{ transformStyle: "preserve-3d" }}
            >
              <motion.div
                className="w-full h-full relative preserve-3d"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                style={{ transformStyle: "preserve-3d" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(!isFlipped);
                }}
              >
                {/* Front Detail */}
                <div className="absolute w-full h-full backface-hidden bg-white border-[4px] border-duo-snow rounded-[40px] shadow-2xl flex flex-col items-center justify-center p-8 text-center">
                  <div className="text-8xl font-black text-duo-eel mb-4 drop-shadow-md">{data.char}</div>
                  <div className="text-2xl font-black text-duo-wolf leading-snug">
                    {data.meaning}<br />{data.sound}
                  </div>
                  <div className="mt-8 px-6 py-2 bg-duo-snow rounded-2xl text-sm font-black text-duo-wolf">
                    {data.level}급 한자
                  </div>
                  <p className="mt-6 text-xs font-bold text-duo-swan animate-pulse">카드를 눌러서 뒤집어봐! 🔄</p>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                    className="absolute top-6 right-6 p-2 text-duo-swan hover:text-duo-eel transition-colors"
                  >
                    <X className="w-8 h-8" />
                  </button>
                </div>

                {/* Back Detail */}
                <div 
                  className="absolute w-full h-full backface-hidden bg-white border-[4px] border-duo-snow rounded-[40px] shadow-2xl flex flex-col items-center justify-between p-8"
                  style={{ transform: "rotateY(180deg)" }}
                >
                  <div className="flex flex-col items-center w-full">
                    <div className="text-xs font-black text-duo-macaw mb-4 uppercase tracking-widest">획순 따라가기</div>
                    <div ref={writerRef} className="w-[140px] h-[140px] mb-6 bg-duo-snow/30 rounded-3xl p-2"></div>
                    
                    {data.examples && data.examples.length > 0 && (
                      <div className="w-full border-t-2 border-duo-snow pt-4">
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <Sparkles className="w-4 h-4 text-duo-bee" />
                          <p className="text-sm font-black text-duo-eel uppercase tracking-tight">활용 단어</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {data.examples.slice(0, 3).map((ex, i) => (
                            <div key={i} className="flex justify-between items-center bg-duo-snow/50 px-4 py-2 rounded-2xl text-sm font-bold">
                              <span className="text-duo-eel">{ex.word}</span>
                              <span className="text-duo-macaw font-black">{ex.hanja}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 w-full mt-6">
                    <button 
                      onClick={handleWriteClick}
                      className="flex-1 flex items-center justify-center gap-2 bg-duo-snow text-duo-eel h-14 rounded-2xl font-black text-base border-2 border-duo-swan hover:bg-duo-swan transition-all shadow-sm"
                    >
                      <Edit3 className="w-5 h-5" /> 써보기
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuiz?.(data.char);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 bg-duo-bee text-white h-14 rounded-2xl font-black text-base shadow-[0_5px_0_0_#e5a500] hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#e5a500] active:translate-y-[3px] active:shadow-none transition-all"
                    >
                      <Trophy className="w-5 h-5" /> 퀴즈
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
