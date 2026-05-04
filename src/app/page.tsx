"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Sparkles, Trophy, Edit3, UserPlus, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import HanjaCard from "@/components/HanjaCard";
import { analyzeWord, generateQuiz, getLearningRecap, getMyProfile, updateProfile } from "./actions";
import QuizSection from "@/components/QuizSection";
import StatsView from "@/components/StatsView";
import WritingModal from "@/components/WritingModal";
import InviteModal from "@/components/InviteModal";
import QuestMap from "@/components/QuestMap";
import { AnimatePresence, motion } from "framer-motion";
import AuthModal from "@/components/AuthModal";
import { createClient } from "@/lib/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";

interface LearningLog {
  word: string;
  is_correct: boolean;
  learned_at: string;
  viewed_stroke?: boolean;
  practiced_writing?: boolean;
}

interface WordExpansion {
  word: string;
  hanja: string;
  description: string;
  type: 'synonym' | 'antonym' | 'expansion';
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
  const [nickname, setNickname] = useState<string | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedHanjaForWriting, setSelectedHanjaForWriting] = useState<{char: string, meaning: string, sound: string} | null>(null);
  const [analysisExpansions, setAnalysisExpansions] = useState<WordExpansion[]>([]);

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
      const result = await updateProfile({ nickname: newName.trim() });
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
      setRecapData(result as unknown as StatsData);

      if (uniqueLogs.length >= trophyGoal && !hasAwardedTrophy) {
        setShowTrophyCelebration(true);
        setHasAwardedTrophy(true);
      }
    }
  }, [hasAwardedTrophy, trophyGoal]);

  useEffect(() => {
    fetchDailyHistory();
  }, [fetchDailyHistory]);

  const handleAnalyze = async (searchWord: string, skipLoadingState = false) => {
    if (!searchWord.trim()) return;
    if (!skipLoadingState) setIsLoading(true);
    setCorrectionMsg(null);
    setAnalysisExpansions([]);

    try {
      const result = await analyzeWord(searchWord.trim());
      if (result.error) {
        alert(result.error);
      } else {
        setAnalyzedHanja(result.hanjaList);
        setCurrentSearchedWord(result.correctedWord || searchWord.trim());
        setAnalysisExpansions(result.expansions || []);
      }
    } catch (e) {
      console.error(e);
      alert("분석 중 오류가 발생했습니다.");
    } finally {
      if (!skipLoadingState) setIsLoading(false);
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
    <div className="min-h-screen bg-white text-duo-eel flex flex-col font-sans pb-24">
      {/* Fixed Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-duo-snow">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-duo-macaw rounded-xl flex items-center justify-center shadow-[0_3px_0_0_#1899d6]">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-duo-eel">한자 타일</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-[10px] font-black text-duo-wolf uppercase tracking-wider">Explorer</span>
              <button 
                onClick={handleUpdateNickname}
                className="text-sm font-black text-duo-macaw hover:underline transition-all"
              >
                {nickname || "탐험가님"} ✨
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              {!user && (
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="bg-duo-snow text-duo-eel px-4 py-2 rounded-xl font-black text-sm border-b-3 border-duo-swan active:border-b-0 active:translate-y-1 transition-all"
                >
                  로그인
                </button>
              )}
              {user && (
                <button 
                  onClick={() => supabase.auth.signOut()}
                  className="text-xs font-bold text-duo-wolf hover:text-duo-eel"
                >
                  로그아웃
                </button>
              )}
            </div>
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
              {/* Daily Mission Progress */}
              <div className="w-full max-w-sm mb-10 mx-auto">
                <div className="bg-white border-3 border-duo-snow rounded-[32px] p-6 shadow-sm">
                  <div className="flex justify-between items-end mb-4">
                    <span className="text-lg font-black text-duo-eel flex items-center gap-2">
                      <Edit3 className="w-5 h-5 text-amber-500" /> 오늘의 미션
                    </span>
                    <span className="text-sm font-black text-duo-wolf">
                      {recapData?.today?.count || 0} / {trophyGoal}
                    </span>
                  </div>
                  <div className="h-4 w-full bg-duo-snow rounded-full overflow-hidden border-2 border-duo-snow">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(((recapData?.today?.count || 0) / trophyGoal) * 100, 100)}%` }}
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Search Form */}
              <div className="w-full max-w-2xl mx-auto mb-12">
                <h2 className="text-center text-3xl font-black text-duo-eel mb-8 tracking-tight">
                  어떤 한자 단어가 궁금해? 🦉
                </h2>
                <form onSubmit={handleSubmit} className="relative group">
                  <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                    <Search className="w-7 h-7 text-duo-wolf group-focus-within:text-duo-macaw transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    placeholder="단어를 검색해봐! (예: 도서관)"
                    className="w-full h-20 pl-16 pr-36 bg-white border-3 border-duo-snow rounded-[32px] text-2xl font-black text-duo-eel placeholder:text-duo-swan/70 focus:outline-none focus:border-duo-macaw focus:ring-8 focus:ring-duo-macaw/5 shadow-[0_6px_0_0_#e5e5e5] transition-all"
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

              {/* Search Results */}
              {analyzedHanja.length > 0 && (
                <div className="w-full flex flex-col gap-8 animate-fade-in">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {analyzedHanja.map((hanja, idx) => (
                      <HanjaCard 
                        key={`${currentSearchedWord}-${idx}`} 
                        data={hanja} 
                        word={currentSearchedWord || undefined}
                        delay={idx * 0.1}
                        onQuiz={(h) => handleRequestQuiz(h)}
                        onWrite={(char, meaning, sound) => setSelectedHanjaForWriting({ char, meaning, sound })}
                        onProgressUpdate={() => fetchDailyHistory()}
                      />
                    ))}
                  </div>

                  {analysisExpansions.length > 0 && (
                    <div className="bg-duo-snow/50 border-3 border-duo-snow rounded-[40px] p-8 shadow-sm">
                      <h3 className="text-2xl font-black text-duo-eel mb-6 flex items-center gap-3">
                        <Sparkles className="w-7 h-7 text-duo-bee" /> 연관 단어도 배워봐!
                      </h3>
                      <div className="flex flex-wrap gap-4">
                        {analysisExpansions.map((exp, i) => (
                          <button
                            key={i}
                            onClick={() => handleAnalyze(exp.word)}
                            className="bg-white border-2 border-duo-snow hover:border-duo-macaw p-6 rounded-3xl transition-all hover:-translate-y-1.5 shadow-sm text-left"
                          >
                            <span className="block text-[10px] font-black text-duo-wolf uppercase mb-2">
                              {exp.type === 'synonym' ? '비슷한 말' : exp.type === 'antonym' ? '반대 말' : '3글자 뭉치'}
                            </span>
                            <span className="text-xl font-black text-duo-eel">{exp.word}</span>
                            <span className="block text-sm font-bold text-duo-swan mt-1">{exp.hanja}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Daily History */}
              {dailyHistory.length > 0 && analyzedHanja.length === 0 && (
                <div className="mt-12">
                  <h3 className="text-2xl font-black text-duo-eel mb-6">오늘 공부한 단어들</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {dailyHistory.map((item, idx) => (
                      <div 
                        key={idx}
                        onClick={() => { setWord(item.word); handleAnalyze(item.word); }}
                        className="bg-white border-2 border-duo-snow px-6 py-5 rounded-3xl flex items-center justify-between shadow-sm hover:border-duo-macaw transition-all cursor-pointer group"
                      >
                        <span className="text-xl font-black text-duo-eel group-hover:text-duo-macaw">{item.word}</span>
                        <div className="flex items-center gap-3">
                          {item.is_correct && <span className="bg-green-100 text-duo-green px-3 py-1 rounded-full text-[10px] font-black">퀴즈 완료</span>}
                          <ChevronRight className="w-5 h-5 text-duo-swan" />
                        </div>
                      </div>
                    ))}
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
              <QuestMap />
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
              {recapData && <StatsView stats={recapData} onClose={() => setActiveTab('search')} />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

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

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
