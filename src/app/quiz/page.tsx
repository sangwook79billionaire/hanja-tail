"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ChevronLeft, Home, RefreshCw, Star, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { analyzeWord, getRandomQuizzes, logLearning } from "../actions";
import HanjaCard from "@/components/HanjaCard";
import WritingModal from "@/components/WritingModal";

interface Quiz {
  id: string;
  word: string;
  hanja_combination: string;
  description: string;
  options: string[];
}

interface HanjaItem {
  char: string;
  meaning: string;
  sound: string;
  level: string;
  examples?: { word: string; hanja: string }[];
}

interface AnalysisResult {
  hanjaList: HanjaItem[];
  correctedWord?: string;
  isLoanword?: boolean;
}

export default function QuizPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<"loading" | "playing" | "result">("loading");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedHanjaForWriting, setSelectedHanjaForWriting] = useState<{char: string, meaning: string, sound: string} | null>(null);

  const fetchQuizzes = useCallback(async () => {
    setGameState("loading");
    const result = await getRandomQuizzes(10);
    if (result.quizzes) {
      setQuizzes(result.quizzes as Quiz[]);
      setGameState("playing");
      setCurrentIndex(0);
      setScore(0);
    }
  }, []);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const handleNext = useCallback(async () => {
    const currentQuiz = quizzes[currentIndex];
    
    if (isCorrect) {
      setScore(prev => prev + 10);
      await logLearning(currentQuiz.word, true);
    }

    if (currentIndex < quizzes.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setAnalysisResult(null);
    } else {
      setGameState("result");
    }
  }, [currentIndex, isCorrect, quizzes]);

  const handleAnswer = async (answer: string) => {
    if (selectedAnswer) return;

    const currentQuiz = quizzes[currentIndex];
    const correct = answer === currentQuiz.word;
    
    setSelectedAnswer(answer);
    setIsCorrect(correct);
    
    if (correct) {
      const result = await analyzeWord(currentQuiz.word);
      setAnalysisResult(result as AnalysisResult);
    } else {
      setTimeout(() => {
        handleNext();
      }, 1500);
    }
  };

  if (gameState === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-duo-snow">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <RefreshCw className="w-12 h-12 text-duo-macaw" />
        </motion.div>
        <p className="mt-4 font-black text-duo-eel">한자 박사님이 문제를 준비 중이야...</p>
      </div>
    );
  }

  if (gameState === "result") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-duo-snow to-white">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-8 shadow-2xl border-2 border-duo-snow max-w-sm w-full text-center"
        >
          <div className="w-24 h-24 bg-duo-bee rounded-full flex items-center justify-center mb-6 mx-auto shadow-[0_8px_0_0_#e5a500]">
            <Trophy className="w-14 h-14 text-white" />
          </div>
          
          <h1 className="text-3xl font-black text-duo-eel mb-2">대단해요!</h1>
          <p className="text-duo-wolf font-bold mb-6">오늘의 탐험 결과</p>
          
          <div className="bg-duo-snow rounded-2xl p-6 mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-duo-wolf">맞힌 문제</span>
              <span className="font-black text-duo-eel text-xl">{score / 10} / 10</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-duo-wolf">획득 점수</span>
              <span className="font-black text-duo-macaw text-2xl">{score}점</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={fetchQuizzes}
              className="w-full bg-duo-green text-white py-4 rounded-2xl font-black text-lg shadow-[0_4px_0_0_#46a302] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" /> 다시 도전하기
            </button>
            <Link href="/" className="w-full bg-white text-duo-wolf py-4 rounded-2xl font-black text-lg border-2 border-duo-swan hover:bg-duo-snow transition-all flex items-center justify-center gap-2">
              <Home className="w-5 h-5" /> 메인으로
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentQuiz = quizzes[currentIndex];
  const progress = ((currentIndex + 1) / quizzes.length) * 100;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Top Bar */}
      <div className="px-6 py-4 flex items-center gap-4 max-w-2xl mx-auto w-full">
        <Link href="/" className="p-2 hover:bg-duo-snow rounded-xl transition-colors">
          <ChevronLeft className="w-6 h-6 text-duo-wolf" />
        </Link>
        <div className="flex-1 h-4 bg-duo-snow rounded-full overflow-hidden border-2 border-duo-snow">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-duo-macaw rounded-full"
          />
        </div>
        <div className="flex items-center gap-1 font-black text-duo-bee">
          <Star className="w-5 h-5 fill-current" />
          {score}
        </div>
      </div>

      {/* Quiz Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-12 max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="w-full"
          >
            {/* Question Card */}
            <div className="bg-white rounded-3xl p-8 mb-8 border-2 border-duo-snow shadow-sm text-center">
              <span className="inline-block px-3 py-1 bg-duo-snow text-duo-wolf text-[10px] font-black rounded-lg mb-4">
                문제 {currentIndex + 1}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-duo-eel leading-relaxed mb-6">
                {currentQuiz.description}
              </h2>
              <div className="text-4xl sm:text-5xl font-black text-duo-macaw opacity-20 tracking-widest">
                {currentQuiz.hanja_combination}
              </div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentQuiz.options.map((option, idx) => {
                const isThisSelected = selectedAnswer === option;
                const isThisCorrect = option === currentQuiz.word;
                
                let buttonStyle = "border-duo-swan hover:bg-duo-snow text-duo-eel";
                if (selectedAnswer) {
                  if (isThisCorrect) {
                    buttonStyle = "bg-green-100 border-duo-green text-duo-green shadow-[0_4px_0_0_#46a302]";
                  } else if (isThisSelected) {
                    buttonStyle = "bg-red-100 border-red-500 text-red-500 shadow-[0_4px_0_0_#ef4444]";
                  } else {
                    buttonStyle = "opacity-50 border-duo-swan text-duo-wolf";
                  }
                }

                return (
                  <motion.button
                    key={idx}
                    whileHover={!selectedAnswer ? { y: -2 } : {}}
                    whileTap={!selectedAnswer ? { y: 2 } : {}}
                    onClick={() => handleAnswer(option)}
                    disabled={!!selectedAnswer}
                    className={cn(
                      "group relative p-6 rounded-2xl border-2 font-black text-xl transition-all text-center",
                      buttonStyle,
                      !selectedAnswer && "shadow-[0_4px_0_0_#e5e5e5] active:shadow-none active:translate-y-1"
                    )}
                  >
                    {option}
                    {selectedAnswer && isThisCorrect && (
                      <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-duo-green animate-bounce" />
                    )}
                    {selectedAnswer && isThisSelected && !isThisCorrect && (
                      <XCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-red-500 animate-shake" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Footer Feedback & Learning */}
      <AnimatePresence>
        {selectedAnswer && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 p-6 sm:p-8 backdrop-blur-md border-t-2 z-50 max-h-[85vh] overflow-y-auto",
              isCorrect ? "bg-green-50/95 border-green-200" : "bg-red-50/95 border-red-200"
            )}
          >
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                    {isCorrect ? <CheckCircle2 className="w-8 h-8 text-duo-green" /> : <XCircle className="w-8 h-8 text-red-500" />}
                  </div>
                  <div>
                    <h3 className={cn("text-xl font-black", isCorrect ? "text-duo-green" : "text-red-500")}>
                      {isCorrect ? "정답이에요! 한자를 공부하고 넘어가자!" : `아쉬워요! 정답은 '${currentQuiz.word}'`}
                    </h3>
                  </div>
                </div>
                {isCorrect && (
                  <button
                    onClick={handleNext}
                    className="bg-duo-green text-white px-8 py-3 rounded-2xl font-black text-lg shadow-duo-green hover:brightness-110 active:translate-y-1 active:shadow-none transition-all"
                  >
                    학습 완료! 다음 문제 🚀
                  </button>
                )}
              </div>

              {/* Learning Area for Correct Answer */}
              {isCorrect && analysisResult && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in pb-12">
                  {analysisResult.hanjaList?.map((hanja: HanjaItem, idx: number) => (
                    <div key={idx} className="scale-90 origin-top">
                      <HanjaCard
                        data={hanja}
                        word={currentQuiz.word}
                        delay={idx * 0.1}
                        onWrite={(char, meaning, sound) => {
                          setSelectedHanjaForWriting({ char, meaning, sound });
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Writing Modal for Quiz Page */}
      <WritingModal
        char={selectedHanjaForWriting?.char || ""}
        meaning={selectedHanjaForWriting?.meaning || ""}
        sound={selectedHanjaForWriting?.sound || ""}
        isOpen={!!selectedHanjaForWriting}
        onClose={() => setSelectedHanjaForWriting(null)}
      />
    </div>
  );
}
