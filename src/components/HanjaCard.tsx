"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HanziWriter from "hanzi-writer";
import { Edit3, Sparkles, X, CheckCircle2 } from "lucide-react";
import { updateLearningProgress } from "../app/actions";
import { cn } from "@/lib/utils";

interface HanjaData {
  char: string;
  meaning: string;
  sound: string;
  originalSound?: string;
  level: string;
  examples?: { word: string; hanja: string }[];
}

export default function HanjaCard({ 
  data, 
  word,
  delay = 0,
  onWrite,
  onQuiz,
  onProgressUpdate,
  isReviewed = false,
  hideWriting = false,
  isCompact = false,
  defaultExpanded = false
}: { 
  data: HanjaData; 
  word?: string;
  delay?: number;
  onWrite?: (char: string, meaning: string, sound: string, originalSound: string | undefined, isReview: boolean) => void;
  onQuiz?: (char: string) => void;
  onProgressUpdate?: () => void;
  isReviewed?: boolean;
  hideWriting?: boolean;
  isCompact?: boolean;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
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
      if (writerRef.current) {
        writerRef.current.innerHTML = "";
      }
      setWriterInstance(null);
      setIsFlipped(false);
    }
  }, [isExpanded, isFlipped, data.char, writerInstance, word, onProgressUpdate]);

  const handleWriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(false); // 쓰기 모달이 열릴 때 카드 확장 닫기
    onWrite?.(data.char, data.meaning, data.sound, data.originalSound, false); // isReview를 false로 변경 (신규 학습/검색 시)
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
        className={cn(
          "relative bg-white border-4 border-duo-snow rounded-[32px] shadow-md hover:border-duo-macaw transition-all cursor-pointer group flex flex-col items-center justify-between overflow-hidden w-full",
          isCompact ? "min-h-[170px] p-3" : "aspect-[4/5] p-4"
        )}
      >
        {/* Status Badge */}
        {isReviewed && (
          <div className="absolute top-3 right-3 bg-white rounded-full p-0.5 shadow-sm border-2 border-duo-green z-10">
            <CheckCircle2 className="w-5 h-5 text-duo-green" />
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center pt-2">
          <div className={cn(
            "font-black text-duo-eel group-hover:scale-110 transition-transform font-myeongjo",
            isCompact ? "text-4xl" : "text-6xl"
          )}>{data.char}</div>
          <div className="text-center leading-tight mt-3 flex flex-col items-center">
            <span className={cn(
              "font-black text-amber-600 font-myeongjo break-keep",
              isCompact ? "text-xs" : "text-xl"
            )}>{data.meaning}</span>
            <div className="flex flex-col items-center">
              <span className={cn(
                "font-black text-duo-macaw font-myeongjo",
                isCompact ? "text-sm" : "text-2xl"
              )}>{data.sound}</span>
              {data.originalSound && data.originalSound !== data.sound && (
                <span className="text-xs font-bold text-duo-wolf opacity-60 font-myeongjo">(본: {data.originalSound})</span>
              )}
            </div>
          </div>
        </div>

        {/* Review CTA Button */}
        <div className={cn(
          "w-full flex gap-2",
          isCompact ? "mt-2" : "mt-4"
        )}>
          {onWrite && (
            <button
              onClick={handleWriteClick}
              className={cn(
                "bg-duo-macaw text-white rounded-2xl font-black shadow-[0_4px_0_0_#1899d6] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-1.5 uppercase",
                onQuiz ? "flex-1" : "w-full",
                isCompact ? "py-2 text-[10px]" : "py-3.5 text-xs"
              )}
            >
              <Edit3 className={isCompact ? "w-3 h-3" : "w-4 h-4"} />
              써보기
            </button>
          )}
          {onQuiz && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(false); onQuiz(data.char); }}
              className={cn(
                "bg-duo-eel text-white rounded-2xl font-black shadow-[0_4px_0_0_#1a1a1a] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-1.5 uppercase",
                onWrite ? "flex-1" : "w-full",
                isCompact ? "py-2 text-[10px]" : "py-3.5 text-xs"
              )}
            >
              <Sparkles className={isCompact ? "w-3 h-3 text-amber-300" : "w-4 h-4 text-amber-300"} />
              탐험하기
            </button>
          )}
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
              className="relative w-full max-w-sm h-[500px] perspective-1000"
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
                  className="absolute w-full h-full backface-hidden bg-white border-[4px] border-duo-snow rounded-[40px] shadow-2xl flex flex-col items-center justify-between p-8 text-center"
                  style={{ transform: "translateZ(1px)" }}
                >
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                    className="absolute top-6 right-6 p-2 text-duo-swan hover:text-duo-eel transition-colors z-10"
                  >
                    <X className="w-8 h-8" />
                  </button>

                  <div className="flex-1 flex flex-col items-center justify-center w-full mt-4">
                    <div className="text-8xl font-black text-duo-eel mb-4 drop-shadow-md font-myeongjo">{data.char}</div>
                    <div className="flex flex-col items-center mb-6">
                      <span className="text-3xl font-black text-amber-600 leading-tight font-myeongjo">{data.meaning}</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-duo-macaw leading-tight font-myeongjo">{data.sound}</span>
                        {data.originalSound && data.originalSound !== data.sound && (
                          <span className="text-base font-bold text-duo-wolf opacity-60 font-myeongjo">(본: {data.originalSound})</span>
                        )}
                      </div>
                    </div>
                    
                    <p className="mb-2 text-base font-black text-duo-macaw animate-bounce bg-blue-50 px-4 py-2 rounded-full border-2 border-blue-100 shadow-sm">
                      카드를 눌러서 뒤집어봐! 🔄
                    </p>
                  </div>

                  <div className="w-full flex flex-col gap-3">
                    <div className="flex gap-4">
                      {onWrite && (
                        <button 
                          onClick={handleWriteClick}
                          className="flex-1 py-4 bg-duo-macaw text-white rounded-2xl font-black text-sm shadow-[0_4px_0_0_#1899d6] active:translate-y-1 active:shadow-none transition-all flex flex-col items-center justify-center gap-1 group"
                        >
                          <div className="flex items-center gap-2">
                            <Edit3 className="w-5 h-5" />
                            써보기
                          </div>
                          <span className="text-[10px] opacity-90 font-bold uppercase tracking-wider">(0.5 point)</span>
                        </button>
                      )}
                      {onQuiz && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setIsExpanded(false); onQuiz(data.char); }}
                          className="flex-1 py-4 bg-duo-eel text-white rounded-2xl font-black text-sm shadow-[0_4px_0_0_#1a1a1a] active:translate-y-1 active:shadow-none transition-all flex flex-col items-center justify-center gap-1 group"
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-300" />
                            연관 단어 탐험
                          </div>
                          <span className="text-[10px] opacity-90 font-bold uppercase tracking-wider">(0.5 point)</span>
                        </button>
                      )}
                    </div>

                    <div className="mx-auto px-4 py-1.5 bg-duo-snow/50 rounded-xl text-xs font-bold text-duo-wolf w-fit">
                      {data.level}급 한자
                    </div>
                  </div>
                </div>

                {/* Back Detail */}
                <div 
                  className="absolute w-full h-full backface-hidden bg-white border-[4px] border-duo-snow rounded-[40px] shadow-2xl flex flex-col items-center p-8 overflow-y-auto scrollbar-hide"
                  style={{ transform: "rotateY(180deg) translateZ(1px)" }}
                >
                  <div className="flex flex-col items-center w-full flex-1">
                    <div className="flex flex-col items-center mb-4 w-full">
                      <div className="text-4xl font-black text-duo-eel font-myeongjo mb-1">{data.char}</div>
                      <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-black text-amber-600">{data.meaning}</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-duo-macaw">{data.sound}</span>
                          {data.originalSound && data.originalSound !== data.sound && (
                            <span className="text-xl font-bold text-duo-wolf opacity-40">({data.originalSound})</span>
                          )}
                        </div>
                      </div>
                      <div className="text-[10px] font-black text-duo-swan uppercase tracking-[0.2em] mt-1">한자 뜻과 음</div>
                    </div>
                    
                    <div className="w-full bg-duo-snow/30 rounded-3xl p-4 border-2 border-duo-snow mb-4 flex flex-col items-center relative">
                      <div className="absolute top-2 left-4 text-[8px] font-black text-duo-wolf/40 uppercase tracking-widest">획순 따라가기</div>
                      <div ref={writerRef} className="w-[120px] h-[120px]"></div>
                    </div>
                    
                    {data.examples && data.examples.length > 0 && (
                      <div className="w-full mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-3 h-3 text-duo-bee" />
                          <p className="text-[10px] font-black text-duo-eel uppercase tracking-tight">이 한자가 들어간 단어</p>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {data.examples.slice(0, 2).map((ex, i) => (
                            <div key={i} className="flex justify-between items-center bg-duo-snow/30 px-3 py-1.5 rounded-xl text-xs font-bold border border-duo-snow/50">
                              <span className="text-duo-eel">{ex.word}</span>
                              <span className="text-duo-macaw font-black">{ex.hanja}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 w-full mt-auto">
                   {!hideWriting && (
                    <button 
                      onClick={handleWriteClick}
                      className="w-full flex items-center justify-between bg-duo-macaw text-white h-14 px-4 rounded-2xl shadow-[0_4px_0_0_#1899d6] active:translate-y-1 active:shadow-none transition-all group"
                    >
                      <div className="flex items-center gap-2 font-black text-base whitespace-nowrap">
                        <Edit3 className="w-5 h-5" /> 따라 써보기
                      </div>
                      <div className="bg-white/20 px-2 py-0.5 rounded-lg text-[9px] font-black shrink-0">+0.5 POINT</div>
                    </button>
                  )}
                    
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
