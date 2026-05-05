"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Trophy, Map as MapIcon, Info, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import HanjaCard from "@/components/HanjaCard";
import { analyzeWord, generateQuiz, getLearningRecap, getMyProfile, updateProfile, logLearning } from "./actions";
import QuizSection from "@/components/QuizSection";
import StatsView from "@/components/StatsView";
import WritingModal from "@/components/WritingModal";
import InviteModal from "@/components/InviteModal";
import QuestMap from "@/components/QuestMap";
import LearningMindMap from "@/components/LearningMindMap";
import { AnimatePresence, motion } from "framer-motion";
import AuthModal from "@/components/AuthModal";
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
  weekly: PeriodStats;
  monthly: PeriodStats;
  total: PeriodStats;
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'search' | 'quest' | 'stats'>('search');
  const [word, setWord] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analyzedHanja, setAnalyzedHanja] = useState<HanjaData[]>([]);
  const [selectedHanjaForQuiz, setSelectedHanjaForQuiz] = useState<string | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<{ word: string; hanja_combination: string; description: string } | null>(null);
  const [recapData, setRecapData] = useState<StatsData | null>(null);
  const [currentSearchedWord, setCurrentSearchedWord] = useState<string | null>(null);
  const [dailyHistory, setDailyHistory] = useState<LearningLog[]>([]);
  const [showTrophyCelebration, setShowTrophyCelebration] = useState(false);
  const [hasAwardedTrophy, setHasAwardedTrophy] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<number>(8);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedHanjaForWriting, setSelectedHanjaForWriting] = useState<{char: string, meaning: string, sound: string, isReview?: boolean} | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [practicedChars, setPracticedChars] = useState<Set<string>>(new Set());

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
      setCurrentStage(profile.current_stage || 8);
      setIsAdmin(!!profile.is_admin);
      setTotalScore(profile.total_score || 0);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchDailyHistory();
    } else {
      setNickname(null);
      setCurrentStage(8);
      setDailyHistory([]);
      setRecapData(null);
      setTotalScore(0);
      setIsAdmin(false);
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

  const handleUpdateNickname = async () => {
    const newName = prompt("멋진 탐험가 이름을 정해볼까요?", nickname || "");
    if (newName && newName.trim()) {
      const result = await updateProfile({ nickname: newName.trim() });
      if (result.success) {
        setNickname(newName.trim());
        alert("와우! 이제부터 " + newName + " 탐험가님이라고 부를게요!");
      } else if (result.error) {
        alert("앗! 닉네임을 바꾸지 못했어요: " + result.error);
      }
    }
  };


  const handleAnalyze = async (searchWord: string, isFromExpansion = false) => {
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
        setPracticedChars(new Set()); // 신규 검색 시 연습 상태 리셋

        // 학습 로그 기록 (부모 단어 포함)
        await logLearning(searchWord.trim(), true, parent || undefined);
        fetchDailyHistory();
      }
    } catch (e) {
      console.error(e);
      alert("분석 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (reviewWord: string) => {
    // 복습 모드: 해당 단어로 바로 검색을 수행하되, 포인트는 쓰기 완료 후에 지급
    setIsLoading(true);
    try {
      const result = await analyzeWord(reviewWord);
      if (!result.error && !result.isAmbiguous && result.hanjaList.length > 0) {
        setWord(reviewWord);
        setAnalyzedHanja(result.hanjaList);
        setCurrentSearchedWord(reviewWord);
        setActiveTab('search');
        
        // "다시 한 번 써보자!" 안내 후 쓰기 모달 오픈
        alert("다시 한 번 써보자! ✍️\n쓰기를 완료하면 보너스 점수를 받을 수 있어요.");
        
        const firstHanja = result.hanjaList[0];
        setSelectedHanjaForWriting({
          char: firstHanja.char,
          meaning: firstHanja.meaning,
          sound: firstHanja.sound,
          isReview: true // 복습 여부 플래그
        });
      }
    } catch (err) {
      console.error(err);
      setWord("");
      setActiveTab("search");
      alert("잠시만 기다려 주세요. 메인 화면으로 이동합니다.");
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

  const getGradeName = (stage: number) => {
    if (stage <= 1) return "천하통일 한자지존";
    if (stage <= 3) return "명불허전 한자고수";
    if (stage <= 5) return "승승장구 한자박사";
    if (stage <= 7) return "일취월장 한자우등생";
    return "의욕충만 초보탐험가";
  };

  return (
    <div className="min-h-screen bg-white text-duo-eel flex flex-col font-sans pb-24">
      {/* Fixed Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-duo-snow">
        <div className="max-w-5xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex flex-col justify-center">
            <h1 className="text-2xl sm:text-3xl font-black tracking-normal text-duo-eel mb-1 flex items-baseline justify-between w-full px-2">
              <span className="text-4xl text-duo-macaw">꼬</span>리에 
              <span className="text-4xl text-duo-macaw">꼬</span>리를 
              <span className="text-4xl text-duo-macaw">무</span>는 漢字
            </h1>
            <div className="flex items-center gap-2 text-xs font-bold text-duo-wolf">
              <button 
                onClick={handleUpdateNickname}
                className="bg-duo-snow px-2 py-0.5 rounded-lg border border-duo-swan hover:bg-duo-swan transition-all"
              >
                탐험가 : {nickname || "익명"}
              </button>
              <span className="bg-duo-macaw/10 text-duo-macaw px-2 py-0.5 rounded-lg border border-duo-macaw/20">탐험가 등급 : {getGradeName(currentStage)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!user ? (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-duo-snow text-duo-eel px-3 py-1.5 rounded-xl font-black text-xs border-b-2 border-duo-swan active:border-b-0 active:translate-y-1 transition-all"
              >
                로그인
              </button>
            ) : (
              <button 
                onClick={() => supabase.auth.signOut()}
                className="text-[10px] font-black text-duo-swan hover:text-duo-eel bg-duo-snow/50 px-2 py-1 rounded-lg border border-duo-snow transition-all"
              >
                로그아웃
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-6">
        <AnimatePresence mode="wait">
          {activeTab === 'search' && (
            <motion.div 
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="py-8"
            >
              {/* 1. Character & Level Section */}
              <div className="w-full flex flex-col items-center mb-10">
                <CharacterView score={totalScore} level={currentStage} />
                <div className="mt-6 text-center">
                  <h2 className="text-2xl font-black text-duo-eel mb-2">용치와 함께 여의주를 모아보자! 🐉</h2>
                  <p className="text-duo-wolf font-bold">한자 공부를 할수록 용치의 꼬리가 빛나요!</p>
                </div>
              </div>

              {/* 2. Instructions Section */}
              <div className="w-full max-w-sm mx-auto mb-10 bg-blue-50 border-2 border-blue-100 rounded-3xl p-6 shadow-sm">
                <h3 className="text-lg font-black text-duo-macaw mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5" /> 여의주를 모으는 방법
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm font-bold text-duo-eel">
                    <span className="flex-shrink-0 w-6 h-6 bg-duo-macaw text-white rounded-full flex items-center justify-center text-xs">1</span>
                    <span>새로운 단어를 검색해서 공부하기 (하루 최대 5개!)</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm font-bold text-duo-eel">
                    <span className="flex-shrink-0 w-6 h-6 bg-duo-macaw text-white rounded-full flex items-center justify-center text-xs">2</span>
                    <span>공부했던 한자를 다시 쓰며 복습하기</span>
                  </li>
                </ul>
              </div>

              {/* 3. Daily Mission Progress */}
              <div className="w-full max-w-sm mb-12 mx-auto">
                <div className="bg-white border-3 border-duo-snow rounded-[32px] p-6 shadow-sm">
                  <div className="flex justify-between items-end mb-4">
                    <span className="text-lg font-black text-duo-eel flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-500" /> 오늘 배운 한자
                    </span>
                    <span className="text-sm font-black text-duo-wolf">
                      {recapData?.today?.count || 0} / 5
                    </span>
                  </div>
                  <div className="h-5 w-full bg-duo-snow rounded-full overflow-hidden border-2 border-duo-snow shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(((recapData?.today?.count || 0) / 5) * 100, 100)}%` }}
                      className="h-full bg-gradient-to-r from-duo-macaw to-blue-400 relative"
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[progress-stripe_2s_linear_infinite]" />
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* 4. Search Form */}
              <div className="w-full max-w-2xl mx-auto mb-16">
                <form onSubmit={handleSubmit} className="relative group">
                  <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                    <Search className="w-7 h-7 text-duo-wolf group-focus-within:text-duo-macaw transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    placeholder="단어를 검색해봐!"
                    className="w-full h-20 pl-16 pr-36 bg-white border-3 border-duo-snow rounded-[32px] text-2xl font-black text-duo-eel focus:outline-none focus:border-duo-macaw focus:ring-8 focus:ring-duo-macaw/5 shadow-[0_6px_0_0_#e5e5e5] transition-all"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !word.trim()}
                    className="absolute right-3 top-3 bottom-3 px-8 bg-duo-macaw text-white rounded-2xl font-black text-xl shadow-[0_4px_0_0_#1899d6] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
                  >
                    찾기!
                  </button>
                </form>
              </div>

              {/* 5. Search Results / Cards */}
              {(analyzedHanja?.length || 0) > 0 && (
                <div className="w-full flex flex-col gap-8 animate-fade-in mb-16">
                  <h3 className="text-xl font-black text-duo-eel px-4">찾아낸 한자 카드</h3>
                  <div className="grid grid-cols-2 gap-4 sm:gap-6">
                    {analyzedHanja?.map((hanja, idx) => (
                      <HanjaCard 
                        key={`${currentSearchedWord}-${idx}`} 
                        data={hanja} 
                        word={currentSearchedWord || undefined}
                        delay={idx * 0.1}
                        onQuiz={(h) => handleRequestQuiz(h)}
                        onWrite={(char, meaning, sound, isReview) => setSelectedHanjaForWriting({ char, meaning, sound, isReview })}
                        onProgressUpdate={() => fetchDailyHistory()}
                        isReviewed={practicedChars.has(hanja.char) || (dailyHistory || []).some(log => log.word === currentSearchedWord && log.practiced_writing)}
                      />
                    ))}
                  </div>
                  
                  {/* Word Completion Progress Info */}
                  <div className="bg-blue-50 border-2 border-blue-100 rounded-3xl p-6 text-center">
                    <p className="text-sm font-black text-duo-macaw mb-2">
                      {practicedChars.size === analyzedHanja.length 
                        ? "✨ 와우! 단어의 모든 한자를 써봤어요! 점수를 획득했습니다." 
                        : `✍️ 단어 완성까지 ${analyzedHanja.length - practicedChars.size}글자 남았어요!`}
                    </p>
                    <div className="flex justify-center gap-2">
                      {analyzedHanja.map((h, i) => (
                        <div 
                          key={i} 
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all",
                            practicedChars.has(h.char) ? "bg-duo-green border-duo-green text-white" : "bg-white border-duo-snow text-duo-swan"
                          )}
                        >
                          {h.char}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Mind Map / History */}
              {(dailyHistory?.length || 0) > 0 && (analyzedHanja?.length || 0) === 0 && (
                <div className="mt-12 w-full">
                  <h3 className="text-2xl font-black text-duo-eel mb-6 px-4">오늘의 한자 꼬리</h3>
                  <div className="bg-white border-3 border-duo-snow rounded-[40px] p-8 shadow-sm overflow-hidden">
                    <LearningMindMap logs={dailyHistory} onReview={handleReview} disabled={isLoading} />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'quest' && (
            <motion.div 
              key="quest"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <QuestMap onNodeClick={(hanja) => {
                if (isLoading) return;
                setWord(hanja);
                handleAnalyze(hanja);
                setActiveTab('search');
              }} />
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="py-10"
            >
              {activeTab === 'stats' && recapData && (
                    <StatsView 
                      stats={recapData} 
                      logs={dailyHistory}
                      onClose={() => setActiveTab('search')} 
                      onReview={handleReview}
                      isAdmin={isAdmin}
                      disabled={isLoading}
                    />
                  )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-white/20 backdrop-blur-[1px] flex items-center justify-center cursor-wait"
          >
            {/* No spinner needed to keep it clean, but interaction is blocked */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t-2 border-duo-snow pb-safe">
        <div className="max-w-md mx-auto h-20 flex items-center justify-around px-4">
          <NavButton 
            icon={<Search className="w-7 h-7" />} 
            label="검색" 
            active={activeTab === 'search'} 
            onClick={() => setActiveTab('search')} 
          />
          <NavButton 
            icon={<MapIcon className="w-7 h-7" />} 
            label="지도" 
            active={activeTab === 'quest'} 
            onClick={() => setActiveTab('quest')} 
          />
          <NavButton 
            icon={<Trophy className="w-7 h-7" />} 
            label="기록" 
            active={activeTab === 'stats'} 
            onClick={() => setActiveTab('stats')} 
          />
        </div>
      </nav>

      {/* Overlays */}
      <AnimatePresence>
        {selectedHanjaForQuiz && currentQuiz && (
          <QuizSection
            hanja={selectedHanjaForQuiz}
            quiz={currentQuiz}
            onSuccess={(solvedWord) => {
              setWord(solvedWord);
              handleAnalyze(solvedWord, true); 
              setTimeout(() => { setSelectedHanjaForQuiz(null); setCurrentQuiz(null); }, 1500);
            }}
            onClose={() => { setSelectedHanjaForQuiz(null); setCurrentQuiz(null); }}
          />
        )}
        
        {showTrophyCelebration && (
          <TrophyCelebration 
            onClose={() => setShowTrophyCelebration(false)} 
            onInvite={() => { setShowTrophyCelebration(false); setIsInviteModalOpen(true); }}
            onStats={() => { setShowTrophyCelebration(false); setActiveTab('stats'); }}
          />
        )}
        
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        <InviteModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
        <WritingModal
          char={selectedHanjaForWriting?.char || ""}
          meaning={selectedHanjaForWriting?.meaning || ""}
          sound={selectedHanjaForWriting?.sound || ""}
          isOpen={!!selectedHanjaForWriting}
          onClose={() => setSelectedHanjaForWriting(null)}
          onComplete={async () => {
            if (!selectedHanjaForWriting) return;
            
            const char = selectedHanjaForWriting.char;
            const newPracticed = new Set(practicedChars);
            newPracticed.add(char);
            setPracticedChars(newPracticed);

            if (currentSearchedWord) {
              // 모든 글자를 다 썼을 때만 DB에 완료 기록 및 포인트 지급
              if (newPracticed.size === analyzedHanja.length) {
                const logRes = await logLearning(currentSearchedWord, true, undefined, true);
                if (logRes.pointsAwarded && logRes.pointsAwarded > 0) {
                  alert(`✨ 참 잘했어요! '${currentSearchedWord}'의 모든 글자를 써봤네요! 보너스 점수 ${logRes.pointsAwarded}점을 받았어요!`);
                }
                fetchDailyHistory();
                fetchProfile(); // 포인트 갱신을 위해 프로필 다시 불러오기
              } else {
                // 아직 남은 글자가 있는 경우
                const remaining = analyzedHanja.length - newPracticed.size;
                alert(`참 잘했어요! ✨\n이제 '${currentSearchedWord}' 단어 완성을 위해 남은 ${remaining}글자도 더 써볼까?`);
              }
            }
          }}
        />
      </AnimatePresence>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 w-20 h-full transition-all",
        active ? "text-duo-macaw scale-110" : "text-duo-swan hover:text-duo-wolf"
      )}
    >
      <div className={cn(
        "p-2 rounded-2xl transition-all",
        active && "bg-duo-macaw/10"
      )}>
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
    </button>
  );
}

function TrophyCelebration({ onClose, onInvite, onStats }: { onClose: () => void, onInvite: () => void, onStats: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.5, y: 50 }} animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-[40px] p-10 flex flex-col items-center text-center shadow-2xl max-w-sm w-full border-4 border-white"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-28 h-28 bg-duo-bee rounded-full flex items-center justify-center mb-8 shadow-[0_10px_0_0_#e5a500] animate-bounce">
          <Trophy className="w-16 h-16 text-white" />
        </div>
        <h2 className="text-4xl font-black text-duo-eel mb-3">축하해요!</h2>
        <p className="text-duo-wolf font-bold text-lg mb-10 leading-relaxed">오늘의 미션 완료!<br/>트로피를 획득했습니다.</p>
        <button onClick={onInvite} className="w-full py-5 bg-amber-100 text-amber-700 rounded-3xl font-black text-xl border-2 border-amber-200 hover:bg-amber-200 transition-all flex items-center justify-center gap-2 mb-3">
          <UserPlus className="w-6 h-6" /> 친구 초대하기 🎖️
        </button>
        <button onClick={onStats} className="w-full py-4 bg-duo-snow text-duo-eel rounded-2xl font-black text-lg hover:bg-duo-swan transition-all mb-3">
          나의 기록 보기 📊
        </button>
        <button onClick={onClose} className="w-full bg-duo-green text-white py-5 rounded-3xl font-black text-xl shadow-[0_6px_0_0_#46a302] active:translate-y-1 transition-all">
          계속 탐험하기 🚀
        </button>
      </motion.div>
    </motion.div>
  );
}

