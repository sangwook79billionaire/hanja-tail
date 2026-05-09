"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Trophy, Map as MapIcon, Sparkles, Gift, Star, User } from "lucide-react";
import { cn } from "@/lib/utils";
import HanjaCard from "@/components/HanjaCard";
import { analyzeWord, generateQuiz, getLearningRecap, getMyProfile, logLearning } from "./actions";
import QuizSection from "@/components/QuizSection";
import StatsView from "@/components/StatsView";
import WritingModal from "@/components/WritingModal";
import QuestMap from "@/components/QuestMap";
import LearningMindMap from "@/components/LearningMindMap";
import { AnimatePresence, motion } from "framer-motion";
import AuthModal from "@/components/AuthModal";
import RequiredInfoModal from "@/components/RequiredInfoModal";
import { createClient } from "@/lib/supabase/client";
import CharacterView from "@/components/CharacterView";
import { User as SupabaseUser } from "@supabase/supabase-js";

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
  originalSound?: string;
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
  missionProgress: number;
  weekly: PeriodStats;
  monthly: PeriodStats;
  total: PeriodStats;
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'search' | 'quest' | 'stats'>('search');
  const [word, setWord] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analyzedHanja, setAnalyzedHanja] = useState<HanjaData[]>([]);
  const [recapData, setRecapData] = useState<StatsData | null>(null);
  const [currentSearchedWord, setCurrentSearchedWord] = useState<string | null>(null);
  const [dailyHistory, setDailyHistory] = useState<LearningLog[]>([]);
  const [showTrophyCelebration, setShowTrophyCelebration] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [coupons, setCoupons] = useState(0);
  const [missionProgress, setMissionProgress] = useState(0);
  const [hasAwardedTrophy, setHasAwardedTrophy] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<number>(8);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showRequiredInfoModal, setShowRequiredInfoModal] = useState(false);
  const [selectedHanjaForWriting, setSelectedHanjaForWriting] = useState<{char: string, meaning: string, sound: string, originalSound?: string, isReview?: boolean} | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [practicedChars, setPracticedChars] = useState<Set<string>>(new Set());
  const [selectedHanjaForQuiz, setSelectedHanjaForQuiz] = useState<string | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<{ word: string; hanja_combination: string; description: string } | null>(null);

  const supabase = createClient();
  const trophyGoal = 5;

  const fetchDailyHistory = useCallback(async () => {
    const result = await getLearningRecap();
    if (result.logs) {
      const todayKst = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(new Date());

      const filtered = result.logs.filter((log: LearningLog) => {
        const logKst = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Seoul',
          year: 'numeric', month: '2-digit', day: '2-digit'
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

      if (result.stats) {
        setRecapData(result.stats as unknown as StatsData);
        setMissionProgress(result.stats.missionProgress || 0);
      }

      if (uniqueLogs.length >= trophyGoal && !hasAwardedTrophy) {
        setShowTrophyCelebration(true);
        setHasAwardedTrophy(true);
      }
    }
  }, [hasAwardedTrophy, trophyGoal]);

  const fetchProfile = useCallback(async () => {
    const { profile } = await getMyProfile();
    if (profile) {
      setNickname(profile.nickname);
      setStreakCount(profile.streak_count || 0);
      setCoupons(profile.coupons || 0);
      setCurrentStage(profile.current_stage || 8);
      setTotalScore(profile.total_score || 0);
      
      if (!profile.school || !profile.grade) {
        setShowRequiredInfoModal(true);
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchDailyHistory();
    } else {
      setNickname(null);
      setDailyHistory([]);
      setRecapData(null);
      setStreakCount(0);
      setCoupons(0);
      setMissionProgress(0);
      setCurrentStage(8);
      setTotalScore(0);
      setHasAwardedTrophy(false);
      setShowTrophyCelebration(false);
    }
  }, [user, fetchProfile, fetchDailyHistory]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setNickname(null);
        setDailyHistory([]);
        setRecapData(null);
        setAnalyzedHanja([]);
        setCurrentSearchedWord(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleAnalyze = async (searchWord: string, isFromExpansion = false, autoOpenFirst = false) => {
    setIsLoading(true);
    setAnalyzedHanja([]);

    if ((recapData?.today?.count || 0) >= 5 && !isFromExpansion) {
      alert("오늘의 신규 한자 학습량(5개)을 모두 채웠어요! 여의주를 더 모으려면 복습을 해보세요. ✨");
      setIsLoading(false);
      return;
    }

    const trimmedWord = searchWord.trim();
    
    // 단순 자음/모음만 있는 오타 체크
    if (/[ㄱ-ㅎㅏ-ㅣ]/.test(trimmedWord)) {
      alert("단어를 올바르게 입력했는지 확인해줄래? 자음이나 모음만 있는 글자는 공부할 수 없어! 🦉");
      setIsLoading(false);
      return;
    }

    // 이전에 검색한 단어를 부모 단어로 설정 (꼬리 물기 추적용)
    const parent = isFromExpansion ? currentSearchedWord : null;

    try {
      const result = await analyzeWord(searchWord.trim());
      if (result.error) {
        alert(result.error);
      } else {
        setAnalyzedHanja(result.hanjaList);
        setCurrentSearchedWord(searchWord.trim());
        
        // [추가] autoOpenFirst가 true면 첫 번째 한자 쓰기 모달 바로 열기
        if (autoOpenFirst && result.hanjaList.length > 0) {
          const first = result.hanjaList[0];
          setSelectedHanjaForWriting({
            char: first.char,
            meaning: first.meaning,
            sound: first.sound,
            originalSound: first.originalSound,
            isReview: false
          });
        }
        
        // 겹쳐진 단어(이미 오늘 써본 한자)는 자동으로 완료 처리
        // 현재 세션의 practicedChars가 누적되고 있으므로, 
        // 이번 단어의 모든 한자가 이미 practicedChars에 있는지 확인
        const isAlreadyComplete = result.hanjaList.length > 0 && result.hanjaList.every((h: HanjaData) => practicedChars.has(h.char));

        // 만약 모든 글자가 이미 다른 단어에서 써본 글자라면 즉시 포인트 지급 시도
        if (isAlreadyComplete) {
          const logRes = await logLearning(searchWord.trim(), true, parent || undefined, true);
          if (logRes.pointsAwarded && logRes.pointsAwarded > 0) {
            alert(`✨ 와우! '${searchWord.trim()}'에 포함된 한자들을 이미 모두 마스터했네요!\n꼬리 물기 성공 보너스 ${logRes.pointsAwarded}점을 바로 지급해드렸어요!`);
          }
        }

        fetchDailyHistory();
      }
    } catch (e) {
      console.error(e);
      alert("분석 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAnalyze(word);
  };

  const handleRequestQuiz = async (hanja: string) => {
    setIsLoading(true);
    try {
      const result = await generateQuiz(hanja, currentSearchedWord || undefined);
      if (result.error) {
        alert(result.error);
      } else {
        setSelectedHanjaForQuiz(hanja);
        setCurrentQuiz(result.quiz);
      }
    } catch (e) {
      console.error(e);
      alert("퀴즈 생성 실패!");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <main className="min-h-screen bg-white text-duo-eel font-sans pb-24 overflow-x-hidden">
      <header className="sticky top-0 z-[40] bg-white/90 backdrop-blur-xl border-b-2 border-duo-snow px-6 py-5 flex flex-col gap-4 shadow-sm">
        {/* Top Row: Brand & Status Items */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black tracking-tighter text-duo-eel flex items-baseline gap-0.5">
              <span className="text-3xl text-indigo-600 mr-0.5">꼬</span>리에 
              <span className="text-3xl text-purple-600 mx-0.5">꼬</span>리를 
              <span className="text-3xl text-emerald-600 mx-0.5">무</span>는 
              <span className="font-myeongjo text-3xl ml-1 tracking-normal">漢字</span>
            </h1>
          </div>

          <div className="flex items-center gap-5">
            {/* Yeouiju (Streak) */}
            <div className="relative group">
              <motion.div 
                animate={{ 
                  scale: streakCount > 0 ? [1, 1.1, 1] : 1,
                  filter: streakCount > 0 ? "drop-shadow(0 0 12px rgba(255, 184, 0, 0.4))" : "none"
                }}
                transition={{ repeat: Infinity, duration: 3 }}
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-700 relative",
                  streakCount > 0 
                    ? "bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 border-2 border-white shadow-md" 
                    : "bg-duo-snow border-2 border-duo-swan opacity-50 grayscale"
                )}
              >
                <Sparkles className={cn("w-6 h-6", streakCount > 0 ? "text-white" : "text-duo-swan")} />
                {streakCount > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 bg-duo-eel text-white text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {streakCount}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Coupons */}
            <div className="relative group">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 relative",
                  coupons > 0 
                    ? "bg-amber-400 border-2 border-white shadow-md" 
                    : "bg-duo-snow border-2 border-duo-swan opacity-50 grayscale"
                )}
              >
                <Gift className={cn("w-5 h-5", coupons > 0 ? "text-white" : "text-duo-swan")} />
                {coupons > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 bg-duo-macaw text-white text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {coupons}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Bottom Row: User Greeting & Auth CTA */}
        <div className="flex items-center justify-between">
          <p className="text-xl font-black text-duo-eel">
            {nickname ? (
              <span className="flex items-center gap-2">
                <span className="text-duo-macaw">{nickname}님</span> 반가워요! 👋
              </span>
            ) : (
              "한자 탐험을 시작해볼까요? 🐉"
            )}
          </p>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={async () => {
                    const supabase = createClient();
                    await supabase.auth.signOut();
                    window.location.reload();
                  }}
                  className="px-4 py-2 text-xs font-black text-duo-wolf hover:text-duo-eel transition-colors"
                >
                  로그아웃
                </button>
                <div className="w-8 h-8 bg-duo-snow rounded-full flex items-center justify-center border-2 border-duo-swan">
                  <User className="w-4 h-4 text-duo-wolf" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-4 py-2 bg-duo-macaw text-white rounded-xl font-black text-xs shadow-[0_3px_0_0_#1899d6] active:translate-y-0.5 active:shadow-none transition-all"
                >
                  로그인 / 회원가입
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-6 pt-8">
        <AnimatePresence mode="wait">
          {activeTab === 'search' && (
            <motion.div 
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden group"
              >
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-5 h-5 text-amber-300" />
                    <span className="text-sm font-black uppercase tracking-widest opacity-90">오늘의 탐험 미션</span>
                  </div>
                  <h3 className="text-3xl font-black mb-6">새로운 단어 3개 탐험</h3>
                  
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex -space-x-3">
                      {[1, 2, 3].map((s) => (
                        <motion.div 
                          key={s} 
                          initial={false}
                          animate={{ 
                            scale: s <= missionProgress ? 1.1 : 1,
                            rotate: s <= missionProgress ? [0, 10, -10, 0] : 0
                          }}
                          className={cn(
                            "w-12 h-12 rounded-full border-4 border-white flex items-center justify-center transition-all shadow-lg",
                            s <= missionProgress ? "bg-amber-400 z-10" : "bg-white/20 backdrop-blur-md"
                          )}
                        >
                          <Star className={cn("w-6 h-6", s <= missionProgress ? "fill-white text-white" : "text-white/40")} />
                        </motion.div>
                      ))}
                    </div>
                    <span className="text-lg font-black opacity-90">{missionProgress}/3 단어 완료</span>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-32 translate-x-32 group-hover:bg-white/20 transition-colors" />
              </motion.div>

              <div className="flex flex-col items-center gap-8">
                <CharacterView score={totalScore} level={currentStage} />
              </div>

              <div className="bg-white p-8 rounded-[40px] border-4 border-duo-snow shadow-xl relative group flex flex-col gap-6">
                <div className="text-center">
                  <h2 className="text-xl font-black text-duo-eel leading-snug">오늘 새로 배운 단어나<br />뜻이 궁금한 단어를 찾아보자</h2>
                </div>

                <form onSubmit={handleSubmit} className="relative">
                  <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                    <Search className="w-6 h-6 text-duo-wolf group-focus-within:text-duo-macaw transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    placeholder="여기에 입력"
                    className="w-full h-16 pl-16 pr-28 bg-duo-snow/50 rounded-2xl text-lg font-black focus:outline-none focus:ring-4 focus:ring-duo-macaw/20 transition-all"
                  />
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={isLoading}
                    className="absolute right-2.5 top-2.5 bottom-2.5 px-6 bg-duo-macaw text-white rounded-xl font-black text-xs shadow-[0_3px_0_0_#1899d6] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center disabled:opacity-50"
                  >
                    {isLoading ? "탐험 중..." : "찾기!"}
                  </motion.button>
                </form>
              </div>

              <AnimatePresence>
                {(analyzedHanja?.length || 0) > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full flex flex-col gap-8 mb-16"
                  >
                    <h3 className="text-xl font-black text-duo-eel px-4">찾아낸 한자 카드</h3>
                    <div className={cn(
                      "grid gap-6 px-2",
                      analyzedHanja.length === 1 && "grid-cols-1",
                      analyzedHanja.length === 2 && "grid-cols-2",
                      analyzedHanja.length === 3 && "grid-cols-3",
                      analyzedHanja.length >= 4 && "grid-cols-2"
                    )}>
                      {analyzedHanja.map((hanja, idx) => (
                        <HanjaCard 
                          key={hanja.char} 
                          data={hanja} 
                          word={currentSearchedWord || undefined}
                          delay={idx * 0.1}
                          onQuiz={(h) => handleRequestQuiz(h)}
                          onWrite={(char, meaning, sound, originalSound, isReview) => setSelectedHanjaForWriting({ char, meaning, sound, originalSound, isReview })}
                          onProgressUpdate={() => fetchDailyHistory()}
                          isReviewed={practicedChars.has(hanja.char) || (dailyHistory || []).some(log => log.word === currentSearchedWord && log.practiced_writing)}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-16">
                <div className="flex items-center justify-between mb-8 px-4">
                  <h3 className="text-2xl font-black text-duo-eel">오늘의 한자 꼬리</h3>
                  <div className="bg-duo-snow px-4 py-2 rounded-2xl text-xs font-black text-duo-wolf">
                    여의주 {dailyHistory.length}개 획득
                  </div>
                </div>
                <LearningMindMap 
                  logs={dailyHistory} 
                  onReview={(w) => handleAnalyze(w, true)}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'quest' && (
            <motion.div 
              key="quest"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
            >
              <QuestMap onNodeClick={(h) => handleAnalyze(h, true)} />
            </motion.div>
          )}

          {activeTab === 'stats' && recapData && (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
            >
              <StatsView 
                stats={recapData} 
                logs={dailyHistory} 
                onClose={() => setActiveTab('search')}
                onReview={(w) => handleAnalyze(w, true)}
                disabled={isLoading}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t-4 border-duo-snow pb-safe">
        <div className="max-w-xl mx-auto flex justify-around items-center h-20 px-4">
          <button 
            onClick={() => setActiveTab('search')}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              activeTab === 'search' ? "text-duo-macaw scale-110" : "text-duo-swan hover:text-duo-eel"
            )}
          >
            <div className={cn("p-2 rounded-2xl", activeTab === 'search' && "bg-duo-macaw/10")}>
              <Search className="w-8 h-8" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">탐험</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('quest')}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              activeTab === 'quest' ? "text-duo-macaw scale-110" : "text-duo-swan hover:text-duo-eel"
            )}
          >
            <div className={cn("p-2 rounded-2xl", activeTab === 'quest' && "bg-duo-macaw/10")}>
              <MapIcon className="w-8 h-8" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">지도</span>
          </button>

          <button 
            onClick={() => setActiveTab('stats')}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              activeTab === 'stats' ? "text-duo-macaw scale-110" : "text-duo-swan hover:text-duo-eel"
            )}
          >
            <div className={cn("p-2 rounded-2xl", activeTab === 'stats' && "bg-duo-macaw/10")}>
              <Trophy className="w-8 h-8" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">기록</span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {selectedHanjaForQuiz && currentQuiz && (
          <QuizSection
            hanja={selectedHanjaForQuiz}
            quiz={currentQuiz}
            onSuccess={(solvedWord) => {
              setWord(solvedWord);
              handleAnalyze(solvedWord, true, true);
              setTimeout(() => { setSelectedHanjaForQuiz(null); setCurrentQuiz(null); }, 1500);
            }}
            onClose={() => { setSelectedHanjaForQuiz(null); setCurrentQuiz(null); }}
          />
        )}
        
        {showTrophyCelebration && (
          <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="bg-white/95 backdrop-blur-xl p-12 rounded-[60px] border-8 border-amber-400 shadow-[0_20px_50px_rgba(251,191,36,0.3)] text-center relative pointer-events-auto"
            >
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="w-full h-full bg-[radial-gradient(circle,rgba(251,191,36,1)_0%,transparent_70%)]" />
              </motion.div>
              <Trophy className="w-40 h-40 text-amber-500 mx-auto mb-8 drop-shadow-lg" />
              <h2 className="text-4xl font-black text-duo-eel mb-4">대단해요! 오늘의 트로피 획득!</h2>
              <p className="text-xl font-bold text-duo-wolf mb-8">매일매일 꾸준히 모험하는 당신은 진정한 한자 박사! 🐉</p>
              <div className="flex gap-4 justify-center">
                <button onClick={() => { setShowTrophyCelebration(false); }} className="px-8 py-4 bg-duo-macaw text-white rounded-2xl font-black shadow-[0_4px_0_0_#1899d6]">모험 계속하기</button>
                <button onClick={() => { setShowTrophyCelebration(false); setActiveTab('stats'); }} className="px-8 py-4 bg-duo-snow text-duo-eel rounded-2xl font-black border-b-4 border-duo-swan">기록 확인하기</button>
              </div>
            </motion.div>
          </div>
        )}
        
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        <RequiredInfoModal
          isOpen={showRequiredInfoModal}
          onComplete={() => {
            setShowRequiredInfoModal(false);
            fetchProfile();
          }}
        />
        <WritingModal
          char={selectedHanjaForWriting?.char || ""}
          meaning={selectedHanjaForWriting?.meaning || ""}
          sound={selectedHanjaForWriting?.sound || ""}
          originalSound={selectedHanjaForWriting?.originalSound}
          isOpen={!!selectedHanjaForWriting}
          onClose={() => setSelectedHanjaForWriting(null)}
          onComplete={async () => {
            if (!selectedHanjaForWriting) return;
            
            const char = selectedHanjaForWriting.char;
            const newPracticed = new Set(practicedChars);
            newPracticed.add(char);
            setPracticedChars(newPracticed);

            if (currentSearchedWord) {
              // 다음 써볼 글자 찾기 (현재 글자 이후부터 찾고, 없으면 처음부터 미완료된 글자 찾기)
              const currentIndex = analyzedHanja.findIndex(h => h.char === char);
              const nextHanja = analyzedHanja.slice(currentIndex + 1).find(h => !newPracticed.has(h.char)) 
                             || analyzedHanja.find(h => !newPracticed.has(h.char));

              if (nextHanja) {
                // 다음 글자로 부드럽게 이동
                setSelectedHanjaForWriting({
                  char: nextHanja.char,
                  meaning: nextHanja.meaning,
                  sound: nextHanja.sound,
                  originalSound: nextHanja.originalSound,
                  isReview: false
                });
              } else {
                // 모든 글자 완료 시
                const logRes = await logLearning(currentSearchedWord, true, undefined, true);
                if (logRes.pointsAwarded && logRes.pointsAwarded > 0) {
                  alert(`✨ 완벽해요! '${currentSearchedWord}'의 모든 글자를 정복했습니다!\n보너스 ${logRes.pointsAwarded}점을 획득했어요!`);
                }
                setSelectedHanjaForWriting(null); // 모달 닫기
                fetchDailyHistory();
                fetchProfile();
              }
            } else {
              setSelectedHanjaForWriting(null);
            }
          }}
        />
      </AnimatePresence>
    </main>
  );
}

