"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HanziWriter from "hanzi-writer";
import { X, RotateCcw, Play, CheckCircle2, Info, Loader2 } from "lucide-react";

interface WritingModalProps {
  char: string;
  meaning: string;
  sound: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function WritingModal({ char, meaning, sound, isOpen, onClose }: WritingModalProps) {
  const targetRef = useRef<HTMLDivElement>(null);
  const [writer, setWriter] = useState<HanziWriter | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let writerInstance: HanziWriter | null = null;

    if (isOpen && targetRef.current) {
      setIsLoading(true);
      setIsComplete(false);

      // DOM이 확실히 렌더링될 때까지 잠깐 기다립니다.
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
            delayBetweenStrokes: 100,
          });

          setWriter(writerInstance);
          setIsLoading(false);

          writerInstance.quiz({
            onComplete: () => {
              if (active && writerInstance) {
                // 1. 성공 상태 즉시 표시
                setIsComplete(true);
                
                // 2. 1초 뒤에 데모 애니메이션 자동 재생
                setTimeout(() => {
                  if (active && writerInstance) {
                    setIsComplete(false); // 애니메이션을 보기 위해 오버레이 잠시 제거
                    writerInstance.animateCharacter({
                      onComplete: () => {
                        if (active) setIsComplete(true); // 데모 종료 후 다시 성공 표시
                      }
                    });
                  }
                }, 1000);
              }
            }
          });
        } catch (err) {
          console.error("HanziWriter init error:", err);
          setIsLoading(false);
        }
      }, 300); // 모달 애니메이션 시간을 고려한 지연

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
                <h2 className="text-3xl font-black text-duo-eel">{char}</h2>
                <p className="text-sm font-bold text-duo-wolf">{meaning} {sound}</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-duo-snow rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-duo-wolf" />
              </button>
            </div>

            <div className="relative bg-duo-snow rounded-2xl p-4 mb-6 border-2 border-duo-swan group flex items-center justify-center min-h-[282px] min-w-[282px]">
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 text-duo-macaw animate-spin mb-2" />
                  <p className="text-xs font-bold text-duo-wolf">종이를 가져오는 중...</p>
                </div>
              )}
              
              <div ref={targetRef} className={cn("touch-none cursor-crosshair", isLoading && "opacity-0")} />
              
              <AnimatePresence>
                {isComplete && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] rounded-xl z-10"
                  >
                    <CheckCircle2 className="w-16 h-16 text-duo-green mb-2" />
                    <p className="text-xl font-black text-duo-green">참 잘했어요!</p>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {!isLoading && (
                <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] font-bold text-duo-swan">
                  <Info className="w-3 h-3" />
                  획순에 맞춰서 써보세요!
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                onClick={handleAnimate}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-white border-2 border-duo-swan rounded-2xl font-black text-duo-wolf hover:bg-duo-snow transition-all disabled:opacity-50"
              >
                <Play className="w-5 h-5 fill-current" /> 순서 보기
              </button>
              <button
                onClick={handleReset}
                disabled={isLoading}
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

// Utility to handle class merging without external lib dependency in this component if needed,
// but since we have cn in lib/utils, let's keep using it.
function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
