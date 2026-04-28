"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, AlertCircle, Trophy } from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { logLearning } from "@/app/actions";

interface QuizData {
  word: string;
  hanja_combination: string;
  description: string;
}

export default function QuizSection({ 
  hanja, 
  quiz, 
  onClose 
}: { 
  hanja: string; 
  quiz: QuizData; 
  onClose: () => void 
}) {
  const [answer, setAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const checkAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    const correct = answer.trim() === quiz.word;
    setIsCorrect(correct);
    setIsSubmitted(true);

    if (correct) {
      logLearning(quiz.word, true);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#58cc02", "#1cb0f6", "#ffc800"],
      });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-white flex flex-col items-center p-6"
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-2 text-duo-wolf hover:bg-duo-snow rounded-full transition-colors"
      >
        <X className="w-8 h-8" />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-block bg-duo-green text-white px-4 py-1 rounded-full text-sm font-bold mb-4 shadow-sm">
            &apos;{hanja}&apos; 꼬리잡기 퀴즈
          </div>
          <h2 className="text-2xl font-bold text-duo-eel leading-tight">
            이 한자가 들어가는<br />단어는 무엇일까요?
          </h2>
        </div>

        <div className="w-full bg-duo-snow border-2 border-duo-swan rounded-3xl p-8 mb-8 relative">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white border-2 border-duo-swan px-4 py-1 rounded-full text-xs font-bold text-duo-wolf uppercase tracking-wider">
            뜻풀이
          </div>
          <p className="text-xl font-bold text-center text-duo-eel leading-relaxed">
            &quot;{quiz.description}&quot;
          </p>
        </div>

        <form onSubmit={checkAnswer} className="w-full space-y-4">
          <div className="relative">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="정답을 입력하세요"
              className={cn(
                "w-full h-16 px-6 text-xl rounded-2xl border-2 transition-all text-center font-bold",
                isSubmitted 
                  ? isCorrect 
                    ? "border-duo-green bg-green-50 text-duo-green" 
                    : "border-duo-cardinal bg-red-50 text-duo-cardinal"
                  : "border-duo-swan focus:border-duo-macaw outline-none"
              )}
              disabled={isSubmitted}
              autoFocus
            />
            {isSubmitted && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {isCorrect ? (
                  <CheckCircle2 className="w-8 h-8 text-duo-green" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-duo-cardinal" />
                )}
              </div>
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
                className="w-full h-14 bg-duo-green text-white rounded-2xl font-black text-lg shadow-duo-green active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                확인하기
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
                    <p className="text-duo-green font-black text-xl mb-4 flex items-center justify-center gap-2">
                      <Trophy className="w-6 h-6" /> 참 잘했어요!
                    </p>
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full h-14 bg-duo-macaw text-white rounded-2xl font-black text-lg shadow-duo-macaw active:translate-y-[4px] active:shadow-none transition-all"
                    >
                      다른 한자 공부하기
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-duo-cardinal font-black text-xl mb-4">
                      아쉬워요! 다시 해볼까요?
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSubmitted(false);
                        setAnswer("");
                        setIsCorrect(null);
                      }}
                      className="w-full h-14 bg-duo-eel text-white rounded-2xl font-black text-lg shadow-[0_4px_0_0_#2b2b2b] active:translate-y-[4px] active:shadow-none transition-all"
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

      {/* Character interaction placeholder */}
      <div className="mt-12 flex items-end gap-4">
        <div className="bg-duo-swan w-24 h-24 rounded-full flex items-center justify-center text-4xl">
          🦉
        </div>
        <div className="bg-white border-2 border-duo-swan rounded-2xl p-4 relative mb-4">
          <div className="absolute -left-2 bottom-4 w-4 h-4 bg-white border-l-2 border-b-2 border-duo-swan rotate-45"></div>
          <p className="font-bold text-duo-eel">
            {isSubmitted 
              ? (isCorrect ? "우와! 너 정말 대단한걸?" : "괜찮아, 다시 생각해보자!") 
              : "이 단어를 맞히면 멋진 트로피를 줄게!"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
