"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HanziWriter from "hanzi-writer";
import { Trophy, Edit3, Sparkles, X, CheckCircle2 } from "lucide-react";
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
  onProgressUpdate,
  isReviewed = false
}: { 
  data: HanjaData; 
  word?: string;
  delay?: number;
  onQuiz?: (hanja: string) => void;
  onWrite?: (char: string, meaning: string, sound: string, isReview: boolean) => void;
  onProgressUpdate?: () => void;
  isReviewed?: boolean;
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
        delayBetweenStrokes: 150, // 조금 더 천천히 보여주기
      });
      setWriterInstance(writer);
      
      // 카드 뒤집히면 자동으로 한 번 애니메이션 보여주기
      writer.animateCharacter();

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
    onWrite?.(data.char, data.meaning, data.sound, true); // true for isReview
  };

  return (
    <>
      {/* Mini Card View */}
      <motion.div
        layoutId={`card-${data.char}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay }}
        onClick={() => setIsExpanded(true)}
        className="relative bg-white border-3 border-duo-snow rounded-[32px] p-4 shadow-sm hover:border-duo-macaw transition-all cursor-pointer group flex flex-col items-center justify-between aspect-[4/5] w-full overflow-hidden"
      >
        {/* Status Badge */}
        {isReviewed && (
          <div className="absolute top-3 right-3 bg-white rounded-full p-0.5 shadow-sm border-2 border-duo-green z-10">
            <CheckCircle2 className="w-5 h-5 text-duo-green" />
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center pt-2">
          <div className="text-6xl font-black text-duo-eel group-hover:scale-110 transition-transform font-myeongjo">{data.char}</div>
          <div className="text-center leading-tight mt-2 flex flex-col items-center">
            <span className="text-lg font-black text-amber-600">{data.meaning}</span>
            <span className="text-xl font-black text-duo-macaw">{data.sound}</span>
          </div>
        </div>

        {/* Review CTA Button */}
        <button
          onClick={handleWriteClick}
          className="w-full mt-3 py-2.5 bg-duo-macaw text-white rounded-2xl font-black text-xs shadow-[0_4px_0_0_#1899d6] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider"
        >
          <Edit3 className="w-3.5 h-3.5" />
          한자공부하기
        </button>
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
            >
              <motion.div
                className="w-full h-full relative preserve-3d"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(!isFlipped);
                }}
              >
                {/* Front Detail */}
                <div 
                  className="absolute w-full h-full backface-hidden bg-white border-[4px] border-duo-snow rounded-[40px] shadow-2xl flex flex-col items-center justify-center p-8 text-center"
                  style={{ transform: "translateZ(1px)" }}
                >
                  <div className="text-8xl font-black text-duo-eel mb-4 drop-shadow-md font-myeongjo">{data.char}</div>
                  <div className="flex flex-col items-center mb-6">
                    <span className="text-3xl font-black text-amber-600 leading-tight">{data.meaning}</span>
                    <span className="text-4xl font-black text-duo-macaw leading-tight">{data.sound}</span>
                  </div>
                  
                  <p className="mb-4 text-lg font-black text-duo-macaw animate-bounce bg-blue-50 px-4 py-2 rounded-full border-2 border-blue-100 shadow-sm">
                    카드를 눌러서 뒤집어봐! 🔄
                  </p>

                  <div className="mt-4 px-4 py-1.5 bg-duo-snow/50 rounded-xl text-xs font-bold text-duo-wolf">
                    {data.level}급 한자
                  </div>
                  
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
                  style={{ transform: "rotateY(180deg) translateZ(1px)" }}
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
                      className="flex-1 flex flex-col items-center justify-center bg-duo-snow text-duo-eel h-16 rounded-2xl border-2 border-duo-swan hover:bg-duo-swan transition-all shadow-sm group"
                    >
                      <div className="flex items-center gap-2 font-black text-base">
                        <Edit3 className="w-5 h-5" /> 써보기
                      </div>
                      <div className="text-[10px] font-black text-duo-green">+0.5 POINT</div>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuiz?.(data.char);
                      }}
                      className="flex-1 flex flex-col items-center justify-center bg-duo-bee text-white h-16 rounded-2xl shadow-[0_5px_0_0_#e5a500] hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#e5a500] active:translate-y-[3px] active:shadow-none transition-all"
                    >
                      <div className="flex items-center gap-2 font-black text-sm">
                        <Trophy className="w-5 h-5" /> 연관 단어 꼬리물기
                      </div>
                      <div className="text-[10px] font-black text-white/90">+1.0 POINT</div>
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
