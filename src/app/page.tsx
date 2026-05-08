"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Trophy, Map as MapIcon, Sparkles, Gift, Star, User, LogIn } from "lucide-react";
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
      <header className="sticky top-0 z-[40] bg-white/90 backdrop-blur-xl border-b-2 border-duo-snow px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-5">
          <div className="relative group">
            <motion.div 
              animate={{ 
                scale: streakCount > 0 ? [1, 1.1, 1] : 1,
                filter: streakCount > 0 ? "drop-shadow(0 0 15px rgba(255, 184, 0, 0.6))" : "none"
              }}
              transition={{ repeat: Infinity, duration: 3 }}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-700 relative",
                streakCount > 0 
                  ? "bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 border-2 border-white" 
                  : "bg-duo-snow border-2 border-duo-swan opacity-50 grayscale"
              )}
            >
              <Sparkles className={cn("w-6 h-6", streakCount > 0 ? "text-white" : "text-duo-swan")} />
              {streakCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-duo-eel text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white ring-2 ring-amber-400/20">
                  {streakCount}
                </div>
              )}
            </motion.div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-duo-eel text-white text-[10px] font-bold px-2 py-1 rounded-lg">
              {streakCount}일 연속 탐험 중!
            </div>
          </div>

          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight text-duo-eel">꼬리에 꼬리를 무는 한자</h1>
            <p className="text-[10px] font-black text-duo-macaw uppercase tracking-widest">{nickname || "탐험가"}님 반가워요!</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 bg-duo-snow/50 px-3 py-2 rounded-2xl border-2 border-duo-snow"
          >
            <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center shadow-inner">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-duo-wolf uppercase tracking-tighter">쿠폰함</span>
              <span className="text-xs font-black text-duo-eel leading-none">{coupons}개</span>
            </div>
          </motion.div>

          <button onClick={() => setIsAuthModalOpen(true)} className="w-10 h-10 bg-duo-snow rounded-full flex items-center justify-center border-2 border-duo-swan hover:bg-duo-macaw hover:text-white transition-all group">
            {user ? <User className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
          </button>
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
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="w-4 h-4 text-amber-300" />
                      <span className="text-xs font-black uppercase tracking-widest opacity-80">오늘의 탐험 미션</span>
                    </div>
                    <h3 className="text-2xl font-black mb-3">연관 단어 3개 정복</h3>
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {[1, 2, 3].map((s) => (
                          <div 
                            key={s} 
                            className={cn(
                              "w-8 h-8 rounded-full border-2 border-white flex items-center justify-center transition-all",
                              s <= missionProgress ? "bg-amber-400" : "bg-white/20 backdrop-blur-md"
                            )}
                          >
                            <Star className={cn("w-4 h-4", s <= missionProgress ? "fill-white text-white" : "text-white/40")} />
                          </div>
                        ))}
                      </div>
                      <span className="text-sm font-black opacity-90">{missionProgress}/3 단어 완료</span>
                    </div>
                  </div>
                  <div className="text-center bg-white/10 backdrop-blur-xl p-4 rounded-3xl border border-white/20">
                    <div className="text-[10px] font-black opacity-80 uppercase mb-1">완료 보상</div>
                    <Gift className="w-8 h-8 text-amber-300 mx-auto mb-1 animate-bounce" />
                    <div className="text-xs font-black">비밀 쿠폰</div>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-20 translate-x-10 group-hover:bg-white/20 transition-colors" />
              </motion.div>

              <div className="flex flex-col items-center">
                <CharacterView score={totalScore} level={currentStage} />
              </div>

              <div className="bg-white p-8 rounded-[40px] border-4 border-duo-snow shadow-xl relative group">
                <form onSubmit={handleSubmit} className="relative">
                  <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                    <Search className="w-7 h-7 text-duo-wolf group-focus-within:text-duo-macaw transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    placeholder="단어를 검색해봐!"
                    className="w-full h-16 pl-16 pr-32 bg-duo-snow/50 rounded-2xl text-lg font-black focus:outline-none focus:ring-4 focus:ring-duo-macaw/20 transition-all"
                  />
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.95 }}
                    disabled={isLoading || !word.trim()}
                    className="absolute right-3 top-3 bottom-3 px-8 bg-duo-macaw text-white rounded-2xl font-black text-xl shadow-[0_4px_0_0_#1899d6] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? "분석 중..." : "찾기!"}
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
                    <div className="grid grid-cols-1 gap-6">
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
              const isWordComplete = analyzedHanja.every((h: HanjaData) => newPracticed.has(h.char));

              if (isWordComplete) {
                const logRes = await logLearning(currentSearchedWord, true, undefined, true);
                if (logRes.pointsAwarded && logRes.pointsAwarded > 0) {
                  alert(`✨ 참 잘했어요! '${currentSearchedWord}'의 모든 글자를 써봤네요! 보너스 점수 ${logRes.pointsAwarded}점을 받았어요!`);
                }
                fetchDailyHistory();
                fetchProfile(); // 포인트 갱신을 위해 프로필 다시 불러오기
              } else {
                // 아직 남은 글자가 있는 경우
                const remaining = analyzedHanja.filter((h: HanjaData) => !newPracticed.has(h.char)).length;
                alert(`참 잘했어요! ✨\n이제 '${currentSearchedWord}' 단어 완성을 위해 남은 ${remaining}글자도 더 써볼까?`);
              }
            }
          }}
        />
      </AnimatePresence>
    </main>
  );
}

