"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Sparkles, Trophy, Gamepad2, Edit3, Eye, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import HanjaCard from "@/components/HanjaCard";
import { analyzeWord, generateQuiz, getLearningRecap, getMyProfile, logLearning, updateNickname } from "./actions";
import QuizSection from "@/components/QuizSection";
import StatsView from "@/components/StatsView";
import WritingModal from "@/components/WritingModal";
import { AnimatePresence, motion } from "framer-motion";
import AuthModal from "@/components/AuthModal";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

interface LearningLog {
  word: string;
  is_correct: boolean;
  learned_at: string;
  viewed_stroke?: boolean;
  practiced_writing?: boolean;
}

interface HanjaData {
  char: string;
  meaning: string;
  sound: string;
  level: string;
  examples?: { word: string; hanja: string }[];
}

interface PeriodStats {
  count: number;
  correct: number;
  days: number;
}

interface StatsData {
  today: PeriodStats;
  weekly: PeriodStats;
  monthly: PeriodStats;
  total: PeriodStats;
}

export default function HomePage() {
  const [word, setWord] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analyzedHanja, setAnalyzedHanja] = useState<HanjaData[]>([]);
  const [selectedHanjaForQuiz, setSelectedHanjaForQuiz] = useState<string | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<{ word: string; hanja_combination: string; description: string } | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [recapData, setRecapData] = useState<StatsData | null>(null);
  const [correctionMsg, setCorrectionMsg] = useState<string | null>(null);
  const [currentSearchedWord, setCurrentSearchedWord] = useState<string | null>(null);
  const [dailyHistory, setDailyHistory] = useState<LearningLog[]>([]);
  const [showTrophyCelebration, setShowTrophyCelebration] = useState(false);
  const [hasAwardedTrophy, setHasAwardedTrophy] = useState(false);
  const [nickname, setNickname] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedHanjaForWriting, setSelectedHanjaForWriting] = useState<{char: string, meaning: string, sound: string} | null>(null);
  const [analysisExpansions, setAnalysisExpansions] = useState<any[]>([]);

  const supabase = createClient();

  const fetchProfile = useCallback(async () => {
    const { profile } = await getMyProfile();
    if (profile) setNickname(profile.nickname);
  }, []);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user, fetchProfile]);

  const handleUpdateNickname = async () => {
    const newName = prompt("멋진 탐험가 이름을 정해볼까요?", nickname || "");
    if (newName && newName.trim()) {
      const result = await updateNickname(newName.trim());
      if (result.success) {
        setNickname(newName.trim());
        alert("와우! 이제부터 " + newName + " 탐험가님이라고 부를게요!");
      } else if (result.error) {
        alert("앗! 닉네임을 바꾸지 못했어요: " + result.error);
      }
    }
  };

  const trophyGoal = 5;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const fetchDailyHistory = useCallback(async () => {
    const result = await getLearningRecap();
    if (result.logs) {
      const todayKst = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());

      const filtered = result.logs.filter((log: LearningLog) => {
        const logKst = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Seoul',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(new Date(log.learned_at));
        return logKst === todayKst;
      });

      const wordMap = new Map<string, LearningLog>();
      
      filtered.forEach((log: LearningLog) => {
        const existing = wordMap.get(log.word);
        if (!existing) {
          wordMap.set(log.word, { ...log });
        } else {
          existing.is_correct = existing.is_correct || log.is_correct;
          existing.viewed_stroke = existing.viewed_stroke || log.viewed_stroke;
          existing.practiced_writing = existing.practiced_writing || log.practiced_writing;
          if (new Date(log.learned_at) > new Date(existing.learned_at)) {
            existing.learned_at = log.learned_at;
          }
        }
      });

      const uniqueLogs = Array.from(wordMap.values()).sort((a, b) => 
        new Date(b.learned_at).getTime() - new Date(a.learned_at).getTime()
      );

      setDailyHistory(uniqueLogs);
    }
    if (result.stats) {
      setRecapData(result.stats);
    }
  }, []);

  useEffect(() => {
    fetchDailyHistory();
  }, [fetchDailyHistory]);

  useEffect(() => {
    const todayCount = recapData?.today?.count || 0;
    if (todayCount >= trophyGoal && !hasAwardedTrophy) {
      setShowTrophyCelebration(true);
      setHasAwardedTrophy(true);
    }
  }, [recapData, hasAwardedTrophy]);

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

  const handleRequestQuiz = async (hanja: string) => {
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

  const handleAnalyze = async (input: string, skipLogging = false) => {
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
        setAnalysisExpansions(result.expansions || []);
        
        if (!skipLogging) {
          await logLearning(finalWord, true);
        }
        
        if (result.correctedWord && result.correctedWord !== input.trim()) {
          setCorrectionMsg(`혹시 '${result.correctedWord}'(을)를 입력하려고 하셨나요? '${result.correctedWord}'(으)로 분석해 드릴게요!`);
        }
        await fetchDailyHistory();
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
    <div className="flex flex-col min-h-screen relative p-6 w-full bg-gradient-to-b from-white to-duo-snow/30">
      {/* Header */}
      <header className="w-full bg-white/90 backdrop-blur-md border-b-2 border-duo-snow sticky top-0 z-50 px-3 sm:px-6 py-2 sm:py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-9 h-9 bg-duo-green rounded-xl flex items-center justify-center shadow-[0_3px_0_0_#46a302] flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-duo-green whitespace-nowrap hidden xs:block">
              꼬리 물기 한자
            </h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-3 bg-white pl-2 sm:pl-4 pr-1 sm:pr-2 py-1.5 rounded-2xl border-2 border-duo-snow overflow-hidden flex-shrink shadow-sm">
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] sm:text-[10px] font-bold text-duo-wolf leading-none uppercase tracking-wider truncate">Explorer</span>
                  <span className="text-sm font-black text-duo-eel truncate">{nickname || "익명"}</span>
                </div>
                <button 
                  onClick={handleUpdateNickname}
                  className="p-1.5 hover:bg-duo-snow rounded-lg text-duo-wolf transition-all hover:text-duo-eel flex-shrink-0"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <div className="w-[2px] h-4 bg-duo-snow mx-1 flex-shrink-0" />
                <button 
                  onClick={() => supabase.auth.signOut()}
                  className="text-xs font-black text-duo-wolf hover:text-red-500 transition-colors whitespace-nowrap px-2"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="px-5 py-2 bg-duo-green text-white rounded-xl border-b-4 border-green-700 font-black hover:brightness-110 active:border-b-0 active:translate-y-1 transition-all text-sm whitespace-nowrap"
              >
                로그인
              </button>
            )}
            
            <div className="flex items-center gap-2 border-l-2 border-duo-snow pl-4 flex-shrink-0">
              <Link 
                href="/quiz"
                className="w-10 h-10 bg-duo-green rounded-xl border-2 border-green-600 flex items-center justify-center hover:bg-green-500 transition-all shadow-[0_2px_0_0_#46a302] hover:translate-y-[1px] active:translate-y-[2px] active:shadow-none flex-shrink-0"
              >
                <Gamepad2 className="w-6 h-6 text-white" />
              </Link>
              <button 
                onClick={openStats}
                className="w-10 h-10 bg-white rounded-xl border-2 border-duo-swan flex items-center justify-center hover:bg-duo-snow transition-all shadow-sm flex-shrink-0"
              >
                <Trophy className="w-6 h-6 text-duo-bee" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center max-w-5xl mx-auto w-full py-8">
        {/* Daily Mission Progress */}
        <div className="w-full max-w-sm mb-10 animate-fade-in-down">
          <div className="bg-white border-2 border-duo-snow rounded-3xl p-5 shadow-sm">
            <div className="flex justify-between items-end mb-3">
              <span className="text-base font-black text-duo-eel flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-500" /> 오늘의 미션
              </span>
              <span className="text-xs font-black text-duo-wolf">
                {recapData?.today?.count || 0} / {trophyGoal} 단어
              </span>
            </div>
            <div className="h-4 w-full bg-duo-snow rounded-full overflow-hidden border-2 border-duo-snow">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(((recapData?.today?.count || 0) / trophyGoal) * 100, 100)}%` }}
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_8px_rgba(251,191,36,0.3)]"
              />
            </div>
            <p className="text-xs font-bold text-duo-wolf mt-3 text-center">
              { (recapData?.today?.count || 0) >= trophyGoal 
                ? "🎉 오늘의 한자왕 트로피 획득 성공!" 
                : `직접 써봐야 미션이 완료돼요! (${trophyGoal - (recapData?.today?.count || 0)}개 더!)`}
            </p>
          </div>
        </div>

        {/* Input Form Area */}
        <div className="w-full max-w-2xl mx-auto mb-12 group">
          <h2 className="text-center text-2xl font-black text-duo-eel mb-6 tracking-tight">
            어떤 한자 단어가 궁금해? 🦉
          </h2>
          <form onSubmit={handleSubmit} className="relative">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <Search className="w-7 h-7 text-duo-wolf group-focus-within:text-duo-macaw transition-colors" />
            </div>
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="단어를 검색해봐! (예: 도서관, 사과)"
              className="w-full h-20 pl-16 pr-36 bg-white border-3 border-duo-snow rounded-3xl text-2xl font-black text-duo-eel placeholder:text-duo-swan/70 focus:outline-none focus:border-duo-macaw focus:ring-8 focus:ring-duo-macaw/5 shadow-[0_6px_0_0_#e5e5e5] transition-all"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !word.trim()}
              className="absolute right-3 top-3 bottom-3 px-8 bg-duo-macaw text-white rounded-2xl font-black text-xl shadow-[0_4px_0_0_#1899d6] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
            >
              {isLoading ? "분석 중..." : "찾아봐!"}
            </button>
          </form>
        </div>

        {/* Results Area */}
        {correctionMsg && (
          <div className="w-full max-w-md mb-8 p-5 bg-amber-50 border-3 border-amber-200 rounded-3xl text-amber-800 font-black text-center shadow-sm animate-bounce">
            💡 {correctionMsg}
          </div>
        )}

        {analyzedHanja.length > 0 && (
          <div className={cn(
            "w-full flex flex-col gap-6 animate-fade-in transition-opacity duration-500",
            isLoading ? "opacity-40 pointer-events-none" : "opacity-100"
          )}>
            <h3 className="text-2xl font-black text-duo-eel mb-4 pl-2 tracking-tight">
              {isLoading ? "🔍 다음 한자를 찾는 중..." : "이런 한자가 들어있어!"}
            </h3>
            
            <div className={cn(
              "grid gap-8 mb-12",
              analyzedHanja.length === 1 ? "max-w-sm mx-auto" :
              analyzedHanja.length === 2 ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto" :
              "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full"
            )}>
              {analyzedHanja.map((hanja, idx) => (
                <HanjaCard 
                  key={`${currentSearchedWord}-${idx}`} 
                  data={hanja} 
                  word={currentSearchedWord || undefined}
                  delay={idx * 0.1}
                  onQuiz={(h) => handleRequestQuiz(h)}
                  onWrite={(char, meaning, sound) => {
                    setSelectedHanjaForWriting({ char, meaning, sound });
                  }}
                  onProgressUpdate={() => fetchDailyHistory()}
                />
              ))}
            </div>

            {/* Expansion Words */}
            {analysisExpansions.length > 0 && (
              <div className="bg-white/90 backdrop-blur-sm border-3 border-duo-snow rounded-[40px] p-8 shadow-sm animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-duo-bee rounded-2xl flex items-center justify-center shadow-[0_3px_0_0_#e4a300]">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-duo-eel tracking-tight">연관 단어도 함께 배워봐!</h3>
                </div>
                <div className="flex flex-wrap gap-4">
                  {analysisExpansions.map((exp: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => handleAnalyze(exp.word)}
                      className="group flex flex-col items-center bg-white border-2 border-duo-snow hover:border-duo-bee p-5 rounded-3xl transition-all hover:-translate-y-1.5 active:translate-y-0 shadow-sm"
                    >
                      <span className="text-[11px] font-black text-duo-wolf uppercase tracking-widest mb-1.5">
                        {exp.type === 'synonym' ? '비슷한 말' : exp.type === 'antonym' ? '반대 말' : '3글자 뭉치'}
                      </span>
                      <span className="text-xl font-black text-duo-eel group-hover:text-duo-bee transition-colors">
                        {exp.word}
                      </span>
                      <span className="text-sm font-bold text-duo-swan mt-1">
                        {exp.hanja}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Daily History Section */}
        {dailyHistory.length > 0 && (
          <div className="w-full mt-16 mb-24 animate-fade-in">
            <div className="flex items-center justify-between mb-6 px-2">
              <h3 className="text-2xl font-black text-duo-eel tracking-tight">오늘 공부한 단어들</h3>
              <div className="px-4 py-1.5 bg-duo-snow rounded-full text-sm font-black text-duo-wolf">
                총 {dailyHistory.length}개
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dailyHistory.map((item, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    setWord(item.word);
                    handleAnalyze(item.word);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-white border-2 border-duo-snow px-6 py-5 rounded-3xl text-base font-black text-duo-eel flex items-center justify-between shadow-sm hover:border-duo-macaw hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xl group-hover:text-duo-macaw transition-colors">{item.word}</span>
                    {item.is_correct && (
                      <span className="bg-green-100 text-duo-green px-3 py-1 rounded-full text-[11px] font-black">
                        퀴즈 완료
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <Search className="w-5 h-5 text-duo-macaw" />
                      <span className="text-[9px] font-black text-duo-wolf">검색</span>
                    </div>
                    <div className="w-4 h-[2px] bg-duo-snow"></div>
                    <div className="flex flex-col items-center gap-1">
                      <Eye className={cn("w-5 h-5", item.viewed_stroke ? "text-duo-macaw" : "text-duo-snow")} />
                      <span className="text-[9px] font-black text-duo-wolf">획순</span>
                    </div>
                    <div className="w-4 h-[2px] bg-duo-snow"></div>
                    <div className="flex flex-col items-center gap-1">
                      <Edit3 className={cn("w-5 h-5", item.practiced_writing ? "text-duo-bee" : "text-duo-snow")} />
                      <span className="text-[9px] font-black text-duo-wolf">쓰기</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Overlays */}
      <AnimatePresence>
        {selectedHanjaForQuiz && currentQuiz && (
          <QuizSection
            hanja={selectedHanjaForQuiz}
            quiz={currentQuiz}
            onSuccess={(solvedWord) => {
              setWord(solvedWord);
              handleAnalyze(solvedWord, true); 
              setTimeout(() => {
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
          <StatsView stats={recapData} onClose={() => setShowStats(false)} />
        )}
        
        {showTrophyCelebration && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
            onClick={() => setShowTrophyCelebration(false)}
          >
            <motion.div 
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[40px] p-10 flex flex-col items-center text-center shadow-2xl max-w-sm w-full border-4 border-white"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-28 h-28 bg-duo-bee rounded-full flex items-center justify-center mb-8 shadow-[0_10px_0_0_#e5a500] animate-bounce">
                <Trophy className="w-16 h-16 text-white" />
              </div>
              <h2 className="text-4xl font-black text-duo-eel mb-3">축하해요!</h2>
              <p className="text-duo-wolf font-bold text-lg mb-10 leading-relaxed">오늘의 한자 탐험을 무사히 마쳤어요!<br/>반짝이는 트로피를 얻었습니다.</p>
              <button 
                onClick={() => {
                  setShowTrophyCelebration(false);
                  openStats();
                }}
                className="w-full py-5 bg-duo-snow text-duo-eel rounded-3xl font-black text-xl hover:bg-duo-swan transition-all mb-3"
              >
                나의 기록 보기 📊
              </button>
              <button 
                onClick={() => setShowTrophyCelebration(false)}
                className="w-full bg-duo-green text-white py-5 rounded-3xl font-black text-xl shadow-[0_6px_0_0_#46a302] active:translate-y-1 active:shadow-none transition-all"
              >
                계속 탐험하기 🚀
              </button>
            </motion.div>
          </motion.div>
        )}
        
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

        <WritingModal
          char={selectedHanjaForWriting?.char || ""}
          meaning={selectedHanjaForWriting?.meaning || ""}
          sound={selectedHanjaForWriting?.sound || ""}
          isOpen={!!selectedHanjaForWriting}
          onClose={() => setSelectedHanjaForWriting(null)}
        />
      </AnimatePresence>
    </div>
  );
}
