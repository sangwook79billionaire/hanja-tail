"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HanziWriter from "hanzi-writer";
import { X, RotateCcw, Play, CheckCircle2, Info, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface WritingModalProps {
  char: string;
  meaning: string;
  sound: string;
  originalSound?: string;
  isOpen: boolean;
  isReview?: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export default function WritingModal({ char, meaning, sound, originalSound, isOpen, onClose, onComplete }: WritingModalProps) {
  const targetRef = useRef<HTMLDivElement>(null);
  const [writer, setWriter] = useState<HanziWriter | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isReviewFinished, setIsReviewFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [narrativeMessage, setNarrativeMessage] = useState("");
  const lastInitializedChar = useRef<string | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let active = true;
    let writerInstance: HanziWriter | null = null;

    if (isOpen && targetRef.current && lastInitializedChar.current !== char) {
      lastInitializedChar.current = char;
      setIsLoading(true);
      setIsComplete(false);
      setIsDemoMode(false);
      setIsReviewFinished(false);
      setNarrativeMessage("어떻게 쓰는지 먼저 한 번 보자~");

      const timer = setTimeout(() => {
        if (!active || !targetRef.current) return;

        try {
          writerInstance = HanziWriter.create(targetRef.current, char, {
            width: 250,
            height: 250,
            padding: 20,
            showOutline: true,
            strokeColor: "#4b4b4b",
            outlineColor: "#eeeeee",
            drawingColor: "#58cc02",
            drawingWidth: 15,
            showHintAfterMisses: 1,
            delayBetweenStrokes: 150,
          });

          setWriter(writerInstance);
          setIsLoading(false);

          // 1단계: 획순 보기 (데모)
          setIsDemoMode(true);
          writerInstance.animateCharacter({
            onComplete: () => {
              if (!active || !writerInstance) return;
              
              // 2단계: 직접 써보기 제안
              setNarrativeMessage("이번엔 한 번 써볼까?");
              setIsDemoMode(false);

              writerInstance.quiz({
                onComplete: () => {
                  if (!active || !writerInstance) return;

                  // 3단계: 써보기 완료 및 칭찬
                  setNarrativeMessage("잘 했어! 정말 멋지다! ✨");
                  setIsComplete(true);
                  
                  // 4단계: 획순 다시 보기 (마무리 데모)
                  setTimeout(() => {
                    if (!active || !writerInstance) return;
                    setIsComplete(false);
                    setNarrativeMessage("다시 한 번 보자! 🧐");
                    setIsDemoMode(true);
                    
                    writerInstance.animateCharacter({
                      onComplete: () => {
                        if (!active) return;
                        setIsDemoMode(false);
                        setIsReviewFinished(true);
                        setNarrativeMessage("학습 완료! 다른 한자도 같이 써보자!");
                        
                        setTimeout(() => {
                          if (active) {
                            onCompleteRef.current?.();
                          }
                        }, 1200);
                      }
                    });
                  }, 2000);
                }
              });
            }
          });
        } catch (err) {
          console.error("HanziWriter init error:", err);
          setIsLoading(false);
        }
      }, 300);

      const currentTarget = targetRef.current;
      return () => {
        active = false;
        clearTimeout(timer);
        if (currentTarget) {
          currentTarget.innerHTML = "";
        }
        setWriter(null);
      };
    }
  }, [isOpen, char]);

  const handleReset = () => {
    if (writer) {
      setIsComplete(false);
      setIsDemoMode(false);
      setIsReviewFinished(false);
      writer.cancelQuiz();
      writer.quiz();
    }
  };

  const handleAnimate = () => {
    if (writer) {
      writer.cancelQuiz();
      writer.animateCharacter({
        onComplete: () => {
          setTimeout(() => {
            if (writer) writer.quiz();
          }, 1000);
        }
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col items-center p-6"
          >
            <div className="w-full flex justify-between items-center mb-4">
              <div className="text-left">
                <h2 className="text-5xl font-black text-duo-eel font-myeongjo mb-1">{char}</h2>
                <div className="flex items-baseline gap-3">
                  <p className="text-2xl font-black text-amber-600">{meaning}</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-black text-duo-macaw">{sound}</p>
                    {originalSound && originalSound !== sound && (
                      <p className="text-sm font-bold text-duo-wolf opacity-40">(본: {originalSound})</p>
                    )}
                  </div>
                </div>
              </div>
              {!isReviewFinished && (
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-duo-snow rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-duo-wolf" />
                </button>
              )}
            </div>
            
            <div className="w-full h-12 flex items-center justify-center mb-2">
              <AnimatePresence mode="wait">
                <motion.p
                  key={narrativeMessage}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-lg font-black text-duo-macaw text-center"
                >
                  {narrativeMessage}
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="relative bg-duo-snow rounded-2xl p-4 mb-6 border-2 border-duo-swan group flex items-center justify-center min-h-[282px] min-w-[282px]">
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 text-duo-macaw animate-spin mb-2" />
                  <p className="text-xs font-bold text-duo-wolf">종이를 가져오는 중...</p>
                </div>
              )}
              
              <div ref={targetRef} className={cn("touch-none cursor-crosshair", (isLoading || isReviewFinished) && "opacity-0")} />
              
              <AnimatePresence>
                {isComplete && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-xl z-10"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.5, repeat: 2 }}
                    >
                      <CheckCircle2 className="w-20 h-20 text-duo-green mb-4" />
                    </motion.div>
                    <p className="text-2xl font-black text-duo-green">참 잘했어요! ✨</p>
                  </motion.div>
                )}

                {isDemoMode && (
                  <div className="absolute top-4 left-4 bg-duo-macaw text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse z-10">
                    {narrativeMessage.includes("다시") ? "획순 다시보기 중..." : "획순 보기 중..."}
                  </div>
                )}

                {isReviewFinished && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-duo-macaw text-white rounded-xl z-20"
                  >
                    <Sparkles className="w-16 h-16 mb-4 animate-bounce" />
                    <p className="text-2xl font-black">복습을 마쳤어요!</p>
                    <p className="mt-2 font-bold opacity-80">점수를 받으러 갑니다...</p>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {!isLoading && !isComplete && !isDemoMode && !isReviewFinished && (
                <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] font-bold text-duo-swan">
                  <Info className="w-3 h-3" />
                  획순에 맞춰서 써보세요!
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                onClick={handleAnimate}
                disabled={isLoading || isReviewFinished}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-white border-2 border-duo-swan rounded-2xl font-black text-duo-eel hover:bg-duo-snow transition-all disabled:opacity-50"
              >
                <Play className="w-5 h-5 fill-current" />
                획순 다시보기
              </button>
              <button
                onClick={handleReset}
                disabled={isLoading || isReviewFinished}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-duo-snow border-2 border-duo-swan rounded-2xl font-black text-duo-eel hover:bg-duo-swan transition-all disabled:opacity-50"
              >
                <RotateCcw className="w-5 h-5" /> 다시 쓰기
              </button>
            </div>

            <p className="mt-6 text-xs font-bold text-duo-wolf text-center leading-relaxed">
              한자를 손으로 직접 써보면<br />
              머릿속에 훨씬 더 오래 기억된답니다! ✨
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

