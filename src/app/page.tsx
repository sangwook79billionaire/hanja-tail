"use client";

import { useState, useEffect } from "react";
import { Search, Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import HanjaCard from "@/components/HanjaCard";
import { analyzeWord, generateQuiz, getLearningRecap } from "./actions";
import QuizSection from "@/components/QuizSection";
import StatsView from "@/components/StatsView";
import { AnimatePresence } from "framer-motion";

interface HanjaData {
  char: string;
  meaning: string;
  sound: string;
  level: string;
}

export default function HomePage() {
  const [word, setWord] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analyzedHanja, setAnalyzedHanja] = useState<HanjaData[]>([]);
  const [selectedHanjaForQuiz, setSelectedHanjaForQuiz] = useState<string | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<{ word: string; hanja_combination: string; description: string } | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [recapData, setRecapData] = useState<{ attendance: number; correctCount: number; totalLearned: number } | null>(null);
  const [correctionMsg, setCorrectionMsg] = useState<string | null>(null);
  const [currentSearchedWord, setCurrentSearchedWord] = useState<string | null>(null);
  const [dailyHistory, setDailyHistory] = useState<any[]>([]);

  const fetchDailyHistory = async () => {
    const result = await getLearningRecap();
    if (result.logs) {
      const today = new Date().toDateString();
      const filtered = result.logs.filter((log: any) => new Date(log.learned_at).toDateString() === today);
      setDailyHistory(filtered);
    }
  };

  useEffect(() => {
    fetchDailyHistory();
  }, []);

  const openStats = async () => {
    setIsLoading(true);
    try {
      const result = await getLearningRecap();
      if (result.stats) {
        setRecapData(result.stats);
        setShowStats(true);
      }
    } catch {
      alert("기록을 가져오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const startQuiz = async (hanja: string) => {
    setIsLoading(true);
    try {
      const result = await generateQuiz(hanja, currentSearchedWord || undefined);
      if (result.quiz) {
        setCurrentQuiz(result.quiz);
        setSelectedHanjaForQuiz(hanja);
      } else if (result.error) {
        alert(result.error);
      }
    } catch {
      alert("퀴즈를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = async (input: string) => {
    if (!input.trim()) return;

    setIsLoading(true);
    setAnalyzedHanja([]);
    setCorrectionMsg(null);
    
    try {
      const result = await analyzeWord(input);
      if (result.error) {
        alert(result.error);
      } else if (result.isLoanword) {
        setCorrectionMsg(`'${input}'은(는) 한자어가 아닌 외래어(또는 순우리말)라고 해! 한자가 들어있는 다른 단어를 찾아볼까?`);
        setAnalyzedHanja([]);
      } else if (result.hanjaList) {
        setAnalyzedHanja(result.hanjaList);
        const finalWord = result.correctedWord || input.trim();
        setCurrentSearchedWord(finalWord);
        logLearning(finalWord, true);
        if (result.correctedWord && result.correctedWord !== input.trim()) {
          setCorrectionMsg(`혹시 '${result.correctedWord}'(을)를 입력하려고 하셨나요? '${result.correctedWord}'(으)로 분석해 드릴게요!`);
        }
        fetchDailyHistory();
      }
    } catch {
      alert("문제를 분석하는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleAnalyze(word);
    setWord("");
  };

  return (
    <div className="flex flex-col min-h-screen relative p-6 w-full">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 pt-4">
        <h1 className="text-2xl font-extrabold text-duo-green tracking-tight flex items-center gap-2">
          <Sparkles className="w-6 h-6" /> 꼬리에 꼬리를 무는 한자학습
        </h1>
        <button 
          onClick={openStats}
          className="w-10 h-10 bg-duo-snow rounded-xl border-2 border-duo-swan flex items-center justify-center hover:bg-duo-swan transition-all"
        >
          <Trophy className="w-6 h-6 text-duo-bee" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center">
        {/* Results */}
        {correctionMsg && (
          <div className="w-full max-w-sm mb-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl text-amber-800 font-bold text-center animate-bounce">
            💡 {correctionMsg}
          </div>
        )}
        {/* Intro */}
        <div className="mb-10 text-center animate-fade-in-up">
          <h2 className="text-2xl font-bold text-duo-eel leading-tight">
            오늘 배운 단어를 알려주면<br />한자의 비밀을 알려줄게!
          </h2>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm mb-12 relative group">
          <input
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="예: 과식, 자동차"
            className="w-full h-16 px-6 text-xl rounded-2xl border-2 border-duo-swan bg-white 
                       focus:border-duo-macaw focus:outline-none focus:ring-0
                       transition-all shadow-sm placeholder:text-duo-swan/80 text-center font-bold"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !word.trim()}
            className={cn(
              "absolute right-2 top-2 bottom-2 aspect-square rounded-xl flex items-center justify-center transition-all",
              word.trim() && !isLoading
                ? "bg-duo-green text-white shadow-duo hover:translate-y-[2px] hover:shadow-[0_2px_0_0_#46a302] active:shadow-none active:translate-y-[4px]"
                : "bg-duo-swan text-duo-wolf cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Search className="w-6 h-6 stroke-[3]" />
            )}
          </button>
        </form>

        {/* Results Area */}
        {analyzedHanja.length > 0 && (
          <div className="w-full flex flex-col gap-4 animate-fade-in">
            <h3 className="text-xl font-bold text-duo-eel mb-2 pl-1">이런 한자가 숨어있어!</h3>
            <div className={cn(
              "grid gap-3 transition-all duration-500",
              analyzedHanja.length === 3 || analyzedHanja.length >= 5 ? "grid-cols-3 w-full" : 
              analyzedHanja.length === 2 || analyzedHanja.length === 4 ? "grid-cols-2 w-[68%] mx-auto" : "grid-cols-2 w-full"
            )}>
              {analyzedHanja.map((hanja, idx) => (
                <HanjaCard 
                  key={idx} 
                  data={hanja} 
                  delay={idx * 0.1} 
                  onQuiz={startQuiz}
                />
              ))}
            </div>
          </div>
        )}

        {/* Daily History */}
        {dailyHistory.length > 0 && (
          <div className="w-full mt-12 mb-20 animate-fade-in">
            <div className="flex items-center gap-2 mb-4 px-1">
              <div className="w-8 h-8 bg-duo-bee rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-duo-eel">오늘 공부한 단어들</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {dailyHistory.map((item, idx) => (
                <div 
                  key={idx}
                  className="bg-white border-2 border-duo-swan px-4 py-2 rounded-xl text-sm font-bold text-duo-eel flex items-center gap-2 shadow-sm"
                >
                  {item.word}
                  {item.is_correct && <span className="text-duo-green">✓</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Quiz Overlay */}
      <AnimatePresence>
        {selectedHanjaForQuiz && currentQuiz && (
          <QuizSection
            hanja={selectedHanjaForQuiz}
            quiz={currentQuiz}
            onSuccess={(solvedWord) => {
              fetchDailyHistory();
              // 1.5초 후 퀴즈창 닫고 새 단어로 분석 시작 (꼬리 물기)
              setTimeout(() => {
                handleAnalyze(solvedWord);
                setSelectedHanjaForQuiz(null);
                setCurrentQuiz(null);
              }, 1500);
            }}
            onClose={() => {
              setSelectedHanjaForQuiz(null);
              setCurrentQuiz(null);
            }}
          />
        )}
        {showStats && recapData && (
          <StatsView
            stats={recapData}
            onClose={() => setShowStats(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
