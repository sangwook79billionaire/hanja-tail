"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, AlertCircle, Trophy, Sparkles, Lightbulb } from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { logLearning } from "@/app/actions";
import Image from "next/image";

interface QuizData {
  word: string;
  hanja_combination: string;
  description: string;
}

export default function QuizSection({ 
  hanja, 
  quiz, 
  onClose,
  onSuccess
}: { 
  hanja: string; 
  quiz: QuizData; 
  onClose: () => void; 
  onSuccess?: (word: string) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hintLevel, setHintLevel] = useState(0); // 0: none, 1: chosung, 2: +1 char, 3: full answer

  const getChosung = (word: string) => {
    const CHO_SUNG = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
    let result = "";
    for (let i = 0; i < word.length; i++) {
      const charCode = word.charCodeAt(i) - 0xac00;
      if (charCode > -1 && charCode < 11172) {
        result += CHO_SUNG[Math.floor(charCode / 588)];
      } else {
        result += word.charAt(i);
      }
    }
    return result;
  };

  const getPartialHint = (word: string) => {
    // Show first character + dots for the rest
    if (word.length <= 1) return word;
    return word[0] + "●".repeat(word.length - 1);
  };

  const checkAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    const correct = answer.trim() === quiz.word;
    
    if (correct) {
      setIsCorrect(true);
      setIsSubmitted(true);
      logLearning(quiz.word, true);
      onSuccess?.(quiz.word);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#58cc02", "#1cb0f6", "#ffc800"],
      });
    } else {
      setIsCorrect(false);
      // Auto-advance hint level on failure
      if (hintLevel < 3) {
        setHintLevel(prev => prev + 1);
      }
      
      // If we've reached hintLevel 3 (show answer), auto-complete
      if (hintLevel === 2) {
        setAnswer(quiz.word);
        setIsCorrect(true);
        setIsSubmitted(true);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-white flex flex-col items-center p-6 overflow-y-auto"
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-2 text-duo-wolf hover:bg-duo-snow rounded-full transition-colors z-10"
      >
        <X className="w-8 h-8" />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm py-12">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-duo-green text-white px-5 py-1.5 rounded-full text-sm font-black mb-4 shadow-sm">
            <Sparkles className="w-4 h-4" />
            &apos;<span className="font-myeongjo">{hanja}</span>&apos; 연관 단어 꼬리물기
          </div>
          <h2 className="text-3xl font-black text-duo-eel leading-tight">
            이 한자가 들어가는<br />단어는 무엇일까요?
          </h2>
        </div>

        <div className="w-full bg-duo-snow border-4 border-duo-swan rounded-[40px] p-8 mb-8 relative shadow-sm">
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-white border-2 border-duo-swan px-6 py-1.5 rounded-full text-xs font-black text-duo-wolf uppercase tracking-widest shadow-sm">
            뜻풀이
          </div>
          <p className="text-xl font-black text-center text-duo-eel leading-relaxed">
            &quot;{quiz.description}&quot;
          </p>
        </div>

        <form onSubmit={checkAnswer} className="w-full space-y-6">
          <div className="relative">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="정답을 입력하세요"
              className={cn(
                "w-full h-20 px-6 text-3xl rounded-3xl border-4 transition-all text-center font-black shadow-sm",
                isSubmitted 
                  ? isCorrect 
                    ? "border-duo-green bg-green-50 text-duo-green shadow-[0_4px_0_0_#46a302]" 
                    : "border-duo-cardinal bg-red-50 text-duo-cardinal shadow-[0_4px_0_0_#c02e3b]"
                  : "border-duo-snow focus:border-duo-macaw outline-none bg-white"
              )}
              disabled={isSubmitted}
              autoFocus
            />
            {isSubmitted && (
              <div className="absolute right-6 top-1/2 -translate-y-1/2">
                {isCorrect ? (
                  <CheckCircle2 className="w-10 h-10 text-duo-green" />
                ) : (
                  <AlertCircle className="w-10 h-10 text-duo-cardinal" />
                )}
              </div>
            )}
          </div>

          {/* Hint Area */}
          <div className="flex flex-col items-center gap-3">
            {hintLevel === 0 && !isSubmitted && (
              <button
                type="button"
                onClick={() => setHintLevel(1)}
                className="flex items-center gap-2 px-6 py-2 bg-amber-50 text-amber-600 rounded-full text-sm font-black border-2 border-amber-200 hover:bg-amber-100 transition-all shadow-sm"
              >
                <Lightbulb className="w-4 h-4" /> 초성 힌트 보기
              </button>
            )}
            
            {hintLevel >= 1 && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="text-2xl tracking-[0.4em] font-black text-duo-macaw bg-blue-50 px-8 py-3 rounded-2xl border-2 border-duo-macaw/20 shadow-sm">
                  {hintLevel === 1 ? getChosung(quiz.word) : getPartialHint(quiz.word)}
                </div>
                {hintLevel === 1 && !isSubmitted && (
                  <p className="text-[10px] font-black text-duo-wolf">한 번 더 틀리면 한 글자를 더 보여줄게! 🦉</p>
                )}
              </motion.div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {!isSubmitted ? (
              <motion.button
                key="submit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                type="submit"
                disabled={!answer.trim()}
                className="w-full h-20 bg-duo-green text-white rounded-[24px] font-black shadow-[0_8px_0_0_#46a302] active:translate-y-[4px] active:shadow-[0_4px_0_0_#46a302] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 group"
              >
                <span className="text-2xl">확인하기</span>
                <span className="bg-black/10 px-4 py-1.5 rounded-xl text-base flex items-center gap-1.5 border border-white/20">
                  <Trophy className="w-4 h-4 text-amber-300" />
                  +1.0 POINT
                </span>
              </motion.button>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full space-y-4"
              >
                {isCorrect ? (
                  <div className="text-center">
                    <p className="text-duo-green font-black text-2xl mb-6 flex items-center justify-center gap-3">
                      <Trophy className="w-8 h-8" /> 참 잘했어요!
                    </p>
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full h-20 bg-duo-macaw text-white rounded-[24px] font-black text-2xl shadow-[0_8px_0_0_#1899d6] active:translate-y-[4px] active:shadow-[0_4px_0_0_#1899d6] transition-all"
                    >
                      다른 한자 공부하기
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-duo-cardinal font-black text-2xl mb-6">
                      아쉬워요! 다시 해볼까요?
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSubmitted(false);
                        setAnswer("");
                        setIsCorrect(null);
                        // Hint level is preserved or incremented automatically
                      }}
                      className="w-full h-20 bg-duo-eel text-white rounded-[24px] font-black text-2xl shadow-[0_8px_0_0_#2b2b2b] active:translate-y-[4px] active:shadow-[0_4px_0_0_#2b2b2b] transition-all"
                    >
                      다시 도전하기
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>

      {/* Character interaction with Yongchi */}
      <div className="mt-8 flex items-end gap-6 max-w-sm w-full bg-blue-50/50 p-6 rounded-[32px] border-2 border-blue-100">
        <div className="relative w-24 h-24 flex-shrink-0">
          <Image
            src="/images/yongchi_5.png"
            alt="용치"
            fill
            className="object-contain"
          />
        </div>
        <div className="bg-white border-2 border-duo-swan rounded-3xl p-5 relative shadow-sm flex-1">
          <div className="absolute -left-2 bottom-6 w-4 h-4 bg-white border-l-2 border-b-2 border-duo-swan rotate-45"></div>
          <p className="font-black text-duo-eel text-sm leading-relaxed">
            {isSubmitted 
              ? (isCorrect ? "우와! 너 정말 대단한걸? 여의주가 더 빛나기 시작했어!" : "괜찮아, 내가 조금 더 힌트를 줄게. 다시 생각해보자!") 
              : "이 단어를 맞히면 멋진 포인트를 줄게! 용치랑 같이 해보자!"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
