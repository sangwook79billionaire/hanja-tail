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
      // 오늘 날짜(KST) 문자열 생성
      const todayKst = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());

      // 1. 오늘치 기록만 필터링
      const filtered = result.logs.filter((log: LearningLog) => {
        const logKst = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Seoul',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(new Date(log.learned_at));
        return logKst === todayKst;
      });

      // 2. 단어별로 중복 제거 및 상태 병합
      const wordMap = new Map<string, LearningLog>();
      
      filtered.forEach((log: LearningLog) => {
        const existing = wordMap.get(log.word);
        if (!existing) {
          wordMap.set(log.word, { ...log });
        } else {
          // 상태 병합: 하나라도 true면 true로 유지
          existing.is_correct = existing.is_correct || log.is_correct;
          existing.viewed_stroke = existing.viewed_stroke || log.viewed_stroke;
          existing.practiced_writing = existing.practiced_writing || log.practiced_writing;
          // 더 최신 시간으로 업데이트
          if (new Date(log.learned_at) > new Date(existing.learned_at)) {
            existing.learned_at = log.learned_at;
          }
        }
      });

      // 3. 최신순으로 다시 정렬하여 상태에 저장
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
    setAnalyzedHanja([]); // 모든 분석 시작 시 이전 결과물은 즉시 지웁니다.
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
        
        // 퀴즈 성공 후 바로 분석하는 경우 등 중복 기록 방지
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
    <div className="flex flex-col min-h-screen relative p-6 w-full">
      {/* Header */}
      <header className="w-full flex items-center justify-between py-4 px-2 mb-8 bg-white/50 backdrop-blur-md sticky top-0 z-50 max-w-4xl mx-auto">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-8 bg-duo-green rounded-lg flex items-center justify-center shadow-[0_2px_0_0_#46a302]">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-duo-green">꼬리 물기 한자</h1>
        </div>
        
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2 bg-white border-2 border-duo-snow pl-3 pr-1 py-1 rounded-2xl shadow-sm">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-duo-wolf leading-none">탐험가</span>
                <span className="text-sm font-black text-duo-eel whitespace-nowrap">{nickname || user.email?.split('@')[0]}</span>
              </div>
              <button 
                onClick={handleUpdateNickname}
                className="p-1.5 hover:bg-duo-snow rounded-lg text-duo-wolf transition-colors"
                title="이름 바꾸기"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <div className="w-[1px] h-4 bg-duo-snow mx-1" />
              <button 
                onClick={() => supabase.auth.signOut()}
                className="px-3 py-1.5 text-xs font-extrabold text-duo-wolf hover:text-duo-eel transition-colors"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="px-4 py-2 bg-duo-green text-white rounded-xl border-b-4 border-green-700 font-black hover:brightness-110 active:border-b-0 active:translate-y-1 transition-all text-sm"
            >
              로그인
            </button>
          )}
          <div className="flex items-center gap-2">
            <Link 
              href="/quiz"
              className="w-10 h-10 bg-duo-green rounded-xl border-2 border-green-600 flex items-center justify-center hover:bg-green-500 transition-all shadow-[0_2px_0_0_#46a302] hover:translate-y-[1px] active:translate-y-[2px] active:shadow-none"
            >
              <Gamepad2 className="w-6 h-6 text-white" />
            </Link>
            <button 
              onClick={openStats}
              className="w-10 h-10 bg-duo-snow rounded-xl border-2 border-duo-swan flex items-center justify-center hover:bg-duo-swan transition-all"
            >
              <Trophy className="w-6 h-6 text-duo-bee" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center">
        {/* Daily Mission Progress */}
        <div className="w-full max-w-sm mb-8 animate-fade-in-down">
          <div className="bg-white/80 backdrop-blur-sm border-2 border-duo-snow rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-black text-duo-eel flex items-center gap-1">
                <Edit3 className="w-4 h-4 text-amber-500" /> 오늘의 한자 쓰기 미션
              </span>
              <span className="text-[10px] font-bold text-duo-wolf">
                {recapData?.today?.count || 0} / {trophyGoal} 단어
              </span>
            </div>
            <div className="h-3 w-full bg-duo-snow rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(((recapData?.today?.count || 0) / trophyGoal) * 100, 100)}%` }}
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_8px_rgba(251,191,36,0.3)]"
              />
            </div>
            <p className="text-[10px] font-bold text-duo-wolf mt-2 text-center">
              { (recapData?.today?.count || 0) >= trophyGoal 
                ? "🎉 오늘의 미션 성공! 트로피 획득!" 
                : `한자를 직접 써봐야 숫자가 올라가요! (${trophyGoal - (recapData?.today?.count || 0)}개 남음)`}
            </p>
          </div>
        </div>

        {/* Results */}
        {correctionMsg && (
          <div className="w-full max-w-sm mb-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl text-amber-800 font-bold text-center animate-bounce">
            💡 {correctionMsg}
          </div>
        )}
        {/* Intro: 오직 데이터가 없고 로딩 중도 아닐 때만 보여줍니다. */}
        {analyzedHanja.length === 0 && !isLoading && (
          <div className="mb-10 text-center animate-fade-in-up">
            <h2 className="text-2xl sm:text-3xl font-black text-duo-eel tracking-tight whitespace-nowrap px-4">
              오늘 배운 단어나 궁금한 단어를 찾아봐!
            </h2>
            <p className="text-lg sm:text-xl font-bold text-duo-wolf mt-2">
              한자의 비밀을 같이 풀어보자!
            </p>
          </div>
        )}

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

        {/* Results Area: 데이터가 있거나 로딩 중일 때도 영역을 유지합니다. */}
        {analyzedHanja.length > 0 && (
          <div className={cn(
            "w-full flex flex-col gap-4 animate-fade-in transition-opacity duration-500",
            isLoading ? "opacity-40 pointer-events-none" : "opacity-100"
          )}>
            <h3 className="text-xl font-bold text-duo-eel mb-2 pl-1">
              {isLoading ? "🔍 다음 한자를 찾는 중..." : "이런 한자가 숨어있어!"}
            </h3>
            <div className={cn(
              "grid gap-3",
              analyzedHanja.length === 3 || analyzedHanja.length >= 5 ? "grid-cols-3 w-full" : 
              analyzedHanja.length === 2 || analyzedHanja.length === 4 ? "grid-cols-2 w-[68%] mx-auto" : "grid-cols-2 w-full"
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
          </div>
        )}

        {/* Daily History & Progress */}
        {dailyHistory.length > 0 && (
          <div className="w-full mt-12 mb-20 animate-fade-in">
            <div className="bg-white border-2 border-duo-swan rounded-2xl p-5 shadow-sm mb-6">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                    (recapData?.today?.count || 0) >= trophyGoal ? "bg-duo-bee" : "bg-duo-snow"
                  )}>
                    <Trophy className={cn("w-5 h-5", (recapData?.today?.count || 0) >= trophyGoal ? "text-white" : "text-duo-wolf")} />
                  </div>
                  <h3 className="text-lg font-bold text-duo-eel">오늘의 미션 완료 현황</h3>
                </div>
                <span className="text-sm font-extrabold text-duo-wolf">
                  {recapData?.today?.count || 0} / {trophyGoal}
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-4 bg-duo-snow rounded-full overflow-hidden border-2 border-duo-swan">
                <motion.div 
                  className="h-full bg-duo-bee"
                  initial={{ width: 0 }}
                  animate={{ width: `${(Math.min(recapData?.today?.count || 0, trophyGoal) / trophyGoal) * 100}%` }}
                  transition={{ type: "spring", bounce: 0.4 }}
                />
              </div>
              <p className="text-xs text-duo-wolf mt-2 font-bold text-center">
                {(recapData?.today?.count || 0) >= trophyGoal 
                  ? "🎉 오늘의 한자왕 트로피 획득!" 
                  : `직접 쓴 한자만 카운트돼요! (${trophyGoal - (recapData?.today?.count || 0)}개 더 쓰기)`}
              </p>
            </div>

            <div className="flex items-center gap-2 mb-4 px-1">
              <h3 className="text-lg font-bold text-duo-eel">오늘 공부한 단어들</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {dailyHistory.map((item, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    setWord(item.word);
                    handleAnalyze(item.word);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-white border-2 border-duo-snow px-4 py-3 rounded-xl text-sm font-bold text-duo-eel flex items-center justify-between shadow-sm hover:border-duo-swan hover:bg-duo-snow transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg group-hover:text-duo-macaw transition-colors">{item.word}</span>
                    {item.is_correct && <span className="bg-green-100 text-duo-green px-2 py-0.5 rounded-full text-[10px]">퀴즈통과</span>}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center gap-0.5">
                      <Search className={cn("w-4 h-4", "text-duo-macaw")} />
                      <span className="text-[8px] text-duo-wolf">검색</span>
                    </div>
                    <div className="w-4 h-[2px] bg-duo-snow"></div>
                    <div className="flex flex-col items-center gap-0.5">
                      <Eye className={cn("w-4 h-4", item.viewed_stroke ? "text-duo-macaw" : "text-duo-snow")} />
                      <span className="text-[8px] text-duo-wolf">획순</span>
                    </div>
                    <div className="w-4 h-[2px] bg-duo-snow"></div>
                    <div className="flex flex-col items-center gap-0.5">
                      <Edit3 className={cn("w-4 h-4", item.practiced_writing ? "text-duo-bee" : "text-duo-snow")} />
                      <span className="text-[8px] text-duo-wolf">쓰기</span>
                    </div>
                  </div>
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
              // 1. 즉시 입력창과 백그라운드 분석 시작 (모달 뒤에서 미리 준비)
              setWord(solvedWord);
              handleAnalyze(solvedWord, true); 

              // 2. 1.2초 후 자연스럽게 모달 닫기 (이미 분석이 진행 중이거나 완료된 상태)
              setTimeout(() => {
                setSelectedHanjaForQuiz(null);
                setCurrentQuiz(null);
              }, 1200);
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
        
        {/* Trophy Celebration */}
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
              className="bg-white rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-24 h-24 bg-duo-bee rounded-full flex items-center justify-center mb-6 shadow-[0_8px_0_0_#e5a500]">
                <Trophy className="w-14 h-14 text-white" />
              </div>
              <h2 className="text-3xl font-black text-duo-eel mb-2">축하해요!</h2>
              <p className="text-duo-wolf font-bold mb-8">오늘의 한자 학습 미션을 완료했어요!<br/>반짝이는 트로피를 획득했습니다.</p>
              <button 
                onClick={() => {
                  setShowTrophyCelebration(false);
                  openStats();
                }}
                className="w-full py-4 bg-duo-snow text-duo-eel rounded-2xl font-black text-lg hover:bg-duo-swan transition-all mb-2"
              >
                상세 기록 보기 📊
              </button>
              <button 
                onClick={() => setShowTrophyCelebration(false)}
                className="w-full bg-duo-green text-white py-4 rounded-2xl font-black text-lg shadow-[0_4px_0_0_#46a302] active:translate-y-1 active:shadow-none transition-all"
              >
                계속 공부하기 🚀
              </button>
            </motion.div>
          </motion.div>
        )}
        {/* Auth Modal */}
        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
        />

        {/* Writing Practice Modal */}
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
