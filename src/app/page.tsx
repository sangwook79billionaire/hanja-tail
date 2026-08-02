"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Trophy, Sparkles, Gift, Star, User, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import HanjaCard from "@/components/HanjaCard";
import { analyzeWord, generateQuiz, getLearningRecap, getMyProfile, logLearning, getSchoolRank } from "./actions";
import QuizSection from "@/components/QuizSection";
import StatsView from "@/components/StatsView";
import WritingModal from "@/components/WritingModal";
import MyPageModal from "@/components/MyPageModal";
import { AnimatePresence, motion } from "framer-motion";
import AuthModal from "@/components/AuthModal";
import RequiredInfoModal from "@/components/RequiredInfoModal";
import { createClient } from "@/lib/supabase/client";

import { User as SupabaseUser } from "@supabase/supabase-js";

interface Expansion {
  word: string;
  hanja: string;
  description: string;
}

interface LearningLog {
  word: string;
  is_correct: boolean;
  learned_at: string;
  viewed_stroke?: boolean;
  practiced_writing?: boolean;
  hanjaDetails?: {
    char: string;
    meaning: string;
    sound: string;
  }[];
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

const getInitialConsonant = (text: string) => {
  const CHO = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
  ];
  return text.split('').map(char => {
    const code = char.charCodeAt(0) - 44032;
    if (code > -1 && code < 11172) return CHO[Math.floor(code / 588)];
    return char;
  }).join('');
};

function ExpansionQuizModal({ expansion, onStart, onClose }: { expansion: Expansion, onStart: (wordWithHanja: string) => void, onClose: () => void }) {
  const [answer, setAnswer] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [showOneCharHint, setShowOneCharHint] = useState(false);

  const initials = getInitialConsonant(expansion.word);
  const oneCharHint = expansion.word[0] + "_".repeat(expansion.word.length - 1);

  const checkAnswer = () => {
    if (answer.trim() === expansion.word) {
      setIsSuccess(true);
    } else {
      alert("다시 한번 생각해볼까? 🦉");
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative bg-white rounded-[40px] p-8 max-w-sm w-full text-center shadow-2xl border-4 border-duo-snow"
      >
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white rounded-full p-4 border-4 border-amber-400 shadow-xl">
          <Sparkles className="w-12 h-12 text-amber-400" />
        </div>
        
        <h3 className="text-2xl font-black text-duo-eel mt-4 mb-4">연관 단어 퀴즈!</h3>
        <p className="text-lg font-bold text-duo-wolf mb-8 leading-relaxed">
          &quot;{expansion.description}&quot;
        </p>
        
        <div className="bg-duo-snow p-6 rounded-3xl mb-6 relative">
          <div className="text-4xl font-black text-duo-eel tracking-widest mb-2">{initials}</div>
          <div className="text-xs font-bold text-duo-wolf opacity-60">초성 힌트</div>
          {showOneCharHint && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 pt-4 border-t-2 border-white text-xl font-black text-amber-500"
            >
              글자 힌트: {oneCharHint}
            </motion.div>
          )}
        </div>

        {!isSuccess ? (
          <div className="space-y-4">
            <input 
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="정답을 입력해줘"
              className="w-full h-16 bg-duo-snow border-2 border-duo-swan rounded-2xl px-6 text-center text-2xl font-black focus:outline-none focus:border-duo-macaw transition-all placeholder:text-duo-swan"
              onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
              autoFocus
            />
            <div className="flex gap-2">
              <button 
                onClick={() => setShowOneCharHint(true)}
                className="flex-1 py-4 bg-white border-2 border-duo-snow text-duo-macaw rounded-2xl font-black text-sm hover:bg-duo-snow transition-all"
              >
                글자 힌트 보기
              </button>
              <button 
                onClick={checkAnswer}
                className="flex-1 py-4 bg-duo-macaw text-white rounded-2xl font-black text-sm shadow-[0_4px_0_0_#1899d6] active:translate-y-1 active:shadow-none transition-all"
              >
                정답 확인!
              </button>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="space-y-6"
          >
            <div className="p-6 bg-duo-green/10 rounded-3xl">
              <p className="text-3xl font-black text-duo-green mb-2">정답이야! 🎉</p>
              <p className="text-duo-wolf font-bold">이제 이 단어를 탐험해볼까?</p>
            </div>
            <button 
              onClick={() => onStart(`${expansion.word}(${expansion.hanja})`)}
              className="w-full py-5 bg-gradient-to-r from-duo-green to-emerald-500 text-white rounded-3xl font-black text-xl shadow-[0_5px_0_0_#46a302] active:translate-y-1 active:shadow-none transition-all"
            >
              탐험 시작하기!
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

function AmbiguityModal({ candidates, onSelect, onClose }: { 
  candidates: { word: string; hanja: string; description: string }[], 
  onSelect: (hanja: string) => void, 
  onClose: () => void 
}) {
  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl border-4 border-duo-snow"
      >
        <h3 className="text-2xl font-black text-duo-eel mb-2">어떤 단어를 찾으시나요?</h3>
        <p className="text-duo-wolf font-bold mb-6">같은 소리지만 뜻이 다른 단어들이 있어요.</p>
        
        <div className="space-y-3">
          {candidates.map((c, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(`${c.word}(${c.hanja})`)}
              className="w-full p-5 bg-duo-snow hover:bg-duo-macaw/10 border-2 border-duo-swan hover:border-duo-macaw rounded-2xl text-left transition-all group"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xl font-black text-duo-eel group-hover:text-duo-macaw">{c.word} ({c.hanja})</span>
                <Play className="w-4 h-4 text-duo-swan group-hover:text-duo-macaw" />
              </div>
              <p className="text-sm font-bold text-duo-wolf">{c.description}</p>
            </button>
          ))}
        </div>
        
        <button 
          onClick={onClose}
          className="w-full mt-6 py-4 text-duo-wolf font-black hover:text-duo-eel transition-colors"
        >
          닫기
        </button>
      </motion.div>
    </div>
  );
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'search' | 'stats'>('search');
  const [word, setWord] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analyzedHanja, setAnalyzedHanja] = useState<HanjaData[]>([]);
  const [recapData, setRecapData] = useState<StatsData | null>(null);
  const [currentSearchedWord, setCurrentSearchedWord] = useState<string | null>(null);
  const [dailyHistory, setDailyHistory] = useState<LearningLog[]>([]);
  const [showTrophyCelebration, setShowTrophyCelebration] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [coupons, setCoupons] = useState(0);
  const [expansionWords, setExpansionWords] = useState<Expansion[]>([]);
  const [selectedExpansionForQuiz, setSelectedExpansionForQuiz] = useState<Expansion | null>(null);
  const [showBeadAnimation, setShowBeadAnimation] = useState(false);
  const [missionProgress, setMissionProgress] = useState(0);
  const [hasAwardedTrophy, setHasAwardedTrophy] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [school, setSchool] = useState<string | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showRequiredInfoModal, setShowRequiredInfoModal] = useState(false);
  const [showMyPageModal, setShowMyPageModal] = useState(false);
  const [selectedHanjaForWriting, setSelectedHanjaForWriting] = useState<{char: string, meaning: string, sound: string, originalSound?: string, isReview?: boolean} | null>(null);
  const [practicedChars, setPracticedChars] = useState<Set<string>>(new Set());
  const [selectedHanjaForQuiz, setSelectedHanjaForQuiz] = useState<string | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<{ word: string; hanja_combination: string; description: string } | null>(null);
  const [previewHanja, setPreviewHanja] = useState<HanjaData | null>(null);
  interface SchoolRankData {
    school: string | null;
    grade: number | null;
    rank: number | null;
    totalStudents: number | null;
    total_score: number;
  }

  const [schoolRank, setSchoolRank] = useState<SchoolRankData | null>(null);
  const [showBeadPopup, setShowBeadPopup] = useState(false);
  const [showGiftPopup, setShowGiftPopup] = useState(false);
  const [ambiguityCandidates, setAmbiguityCandidates] = useState<{ word: string; hanja: string; description: string }[] | null>(null);

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
    getSchoolRank().then(rankInfo => setSchoolRank(rankInfo));
  }, [hasAwardedTrophy, trophyGoal]);

  const fetchProfile = useCallback(async () => {
    const { profile } = await getMyProfile();
    if (profile) {
      setNickname(profile.nickname);
      setSchool(profile.school);
      setGrade(profile.grade);
      setStreakCount(profile.streak_count || 0);
      setCoupons(profile.coupons || 0);
      
      if (!profile.school || !profile.grade) {
        setShowRequiredInfoModal(true);
      }
      
      const rankInfo = await getSchoolRank();
      setSchoolRank(rankInfo);
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
      setSchoolRank(null);
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
      const result = await analyzeWord(trimmedWord);
      if (result.error) {
        alert(result.error);
      } else if (result.isAmbiguous) {
        setAmbiguityCandidates(result.candidates);
      } else {
        setAnalyzedHanja(result.hanjaList);
        setCurrentSearchedWord(trimmedWord);
        setExpansionWords(result.expansions || []);
        
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
        const isAlreadyComplete = result.hanjaList.length > 0 && result.hanjaList.every((h: HanjaData) => practicedChars.has(h.char));

        if (isAlreadyComplete) {
          const logRes = await logLearning(trimmedWord, true, parent || undefined, true);
          if (logRes.pointsAwarded && logRes.pointsAwarded > 0) {
            alert(`✨ 와우! '${trimmedWord}'에 포함된 한자들을 이미 모두 마스터했네요!\n꼬리 물기 성공 보너스 ${logRes.pointsAwarded}점을 바로 지급해드렸어요!`);
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
      const learnedWords = dailyHistory.map(log => log.word);
      const excluded = [currentSearchedWord || "", ...learnedWords].filter(Boolean);
      const uniqueExcluded = Array.from(new Set(excluded));

      const result = await generateQuiz(hanja, uniqueExcluded);
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
            <div className="relative group cursor-pointer" onClick={() => setShowBeadPopup(true)}>
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
            <div className="relative group cursor-pointer" onClick={() => setShowGiftPopup(true)}>
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
                <button 
                  onClick={() => setShowMyPageModal(true)}
                  className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-duo-snow shadow-sm hover:border-indigo-400 transition-all group"
                >
                  <User className="w-5 h-5 text-duo-wolf group-hover:text-indigo-500 transition-colors" />
                </button>
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
                    className="w-full h-20 pl-16 pr-36 bg-duo-snow/50 rounded-2xl text-xl font-black focus:outline-none focus:ring-4 focus:ring-duo-macaw/20 transition-all"
                  />
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={isLoading}
                    className="absolute right-3 top-3 bottom-3 px-8 bg-duo-macaw text-white rounded-2xl font-black text-base shadow-[0_4px_0_0_#1899d6] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center disabled:opacity-50"
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
                    <div className="px-4 space-y-1">
                      <h3 className="text-xl font-black text-duo-eel">찾아낸 한자 카드</h3>
                      <p className="text-sm font-bold text-duo-wolf">한자를 같이 써보고, 카드를 뒤집어서 획순도 확인해보자! ✍️🔄</p>
                    </div>
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
                          onWrite={(char, meaning, sound, originalSound, isReview) => setSelectedHanjaForWriting({ char, meaning, sound, originalSound, isReview })}
                          onProgressUpdate={() => fetchDailyHistory()}
                          isReviewed={practicedChars.has(hanja.char) || (dailyHistory || []).some(log => log.word === currentSearchedWord && log.practiced_writing)}
                          isCompact={analyzedHanja.length >= 3}
                        />
                      ))}
                    </div>

                    {expansionWords.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 px-4"
                      >
                        <h4 className="text-lg font-black text-duo-eel mb-4 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-amber-400" />
                          다른 연관 단어도 공부해볼래?
                        </h4>
                        <div className="flex flex-wrap gap-3">
                          {expansionWords.map((exp) => (
                            <button
                              key={exp.word}
                              onClick={() => setSelectedExpansionForQuiz(exp)}
                              className="px-5 py-3 bg-white border-2 border-duo-snow rounded-2xl font-black text-duo-eel hover:border-duo-macaw hover:text-duo-macaw transition-all shadow-sm flex items-center gap-2 group"
                            >
                              <span>{exp.word}</span>
                              <div className="w-6 h-6 bg-duo-snow rounded-lg flex items-center justify-center group-hover:bg-duo-macaw/10">
                                <Search className="w-3.5 h-3.5 text-duo-wolf group-hover:text-duo-macaw" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {(() => {
                const allHanjaDetails = dailyHistory.flatMap(log => log.hanjaDetails || []);
                const uniqueHanjaList = Array.from(
                  new Map(allHanjaDetails.map(item => [item.char, item])).values()
                );

                return (
                  <div className="mt-16">
                    <div className="flex items-center justify-between mb-8 px-4">
                      <h3 className="text-2xl font-black text-duo-eel">오늘 배운 한자</h3>
                      <div className="bg-duo-snow px-4 py-2 rounded-2xl text-xs font-black text-duo-wolf">
                        총 {uniqueHanjaList.length}개 학습
                      </div>
                    </div>

                    {uniqueHanjaList.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                        {uniqueHanjaList.map((hj) => (
                          <motion.div
                            key={hj.char}
                            whileHover={{ scale: 1.05, y: -4 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setPreviewHanja({
                                char: hj.char,
                                meaning: hj.meaning,
                                sound: hj.sound,
                                level: "학습됨"
                              });
                            }}
                            className="bg-white border-4 border-duo-snow hover:border-duo-macaw rounded-[28px] p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1 shadow-sm hover:shadow-md group"
                          >
                            <span className="text-3xl font-black text-duo-eel font-myeongjo group-hover:text-duo-macaw transition-colors">
                              {hj.char}
                            </span>
                            <span className="text-xs font-bold text-amber-600 font-myeongjo leading-tight mt-1">
                              {hj.meaning} {hj.sound}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 px-6 border-4 border-dashed border-duo-snow rounded-[32px] text-center bg-white/40">
                        <Sparkles className="w-10 h-10 text-amber-400 mb-3 animate-pulse" />
                        <h4 className="text-lg font-black text-duo-eel mb-1">오늘 배운 한자가 아직 없어요</h4>
                        <p className="text-xs font-bold text-duo-wolf">궁금한 단어를 검색하고 꼬리물기를 하여 한자를 모아보세요! 🐉</p>
                      </div>
                    )}
                  </div>
                );
              })()}
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
                isLoggedIn={!!user}
                school={school}
                grade={grade}
                schoolRank={schoolRank}
                onAuthClick={() => setIsAuthModalOpen(true)}
                onRequiredInfoClick={() => setShowRequiredInfoModal(true)}
                onMyPageClick={() => setShowMyPageModal(true)}
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
              <h2 className="text-4xl font-black text-duo-eel mb-4 break-keep">대단해요! 오늘의 트로피 획득!</h2>
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
        <MyPageModal
          isOpen={showMyPageModal}
          onClose={() => setShowMyPageModal(false)}
          initialData={{ nickname, school, grade }}
          onUpdate={fetchProfile}
        />
        <WritingModal
          char={selectedHanjaForWriting?.char || ""}
          meaning={selectedHanjaForWriting?.meaning || ""}
          sound={selectedHanjaForWriting?.sound || ""}
          originalSound={selectedHanjaForWriting?.originalSound}
          isOpen={!!selectedHanjaForWriting}
          isReview={selectedHanjaForWriting?.isReview}
          onClose={() => setSelectedHanjaForWriting(null)}
          onComplete={async () => {
            if (!selectedHanjaForWriting) return;
            
            const char = selectedHanjaForWriting.char;
            const newPracticed = new Set(practicedChars);
            newPracticed.add(char);
            setPracticedChars(newPracticed);

            if (currentSearchedWord) {
              const currentIndex = analyzedHanja.findIndex(h => h.char === char);
              const nextHanja = analyzedHanja.slice(currentIndex + 1).find(h => !newPracticed.has(h.char)) 
                             || analyzedHanja.find(h => !newPracticed.has(h.char));

              if (nextHanja) {
                // 다음 글자로 넘어가기 전에 약간의 여유를 줌 (모달이 바로 바뀌는 것 방지)
                setTimeout(() => {
                  setSelectedHanjaForWriting({
                    char: nextHanja.char,
                    meaning: nextHanja.meaning,
                    sound: nextHanja.sound,
                    originalSound: nextHanja.originalSound,
                    isReview: false
                  });
                }, 1500);
              } else {
                // 모든 글자 완료 시: 여의주 애니메이션 트리거
                setShowBeadAnimation(true);
                
                // 애니메이션이 진행되는 동안 백그라운드에서 학습 기록
                logLearning(currentSearchedWord, true, undefined, false, true).then(() => {
                  fetchDailyHistory();
                  fetchProfile();
                });
                
                // 여의주가 충분히 날아갈 시간을 확보 (4초)
                setTimeout(() => {
                  setSelectedHanjaForWriting(null);
                  setShowBeadAnimation(false); // 애니메이션 종료 후 리셋
                }, 4000);
              }
            } else {
              setSelectedHanjaForWriting(null);
            }
          }}
        />
        
        {showBeadAnimation && (
          <motion.div
            initial={{ left: "50%", top: "50%", x: "-50%", y: "-50%", scale: 0, opacity: 0 }}
            animate={{ 
              left: ["50%", "50%", "85%"], 
              top: ["50%", "30%", "45px"], 
              scale: [0, 2.5, 0.6],
              opacity: [0, 1, 1, 0] 
            }}
            transition={{ 
              duration: 2.5, 
              ease: "easeInOut",
              times: [0, 0.4, 0.8, 1]
            }}
            className="fixed z-[999] w-16 h-16 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 rounded-full shadow-[0_0_50px_rgba(251,191,36,0.9)] border-4 border-white flex items-center justify-center pointer-events-none"
          >
            <Sparkles className="w-10 h-10 text-white animate-pulse" />
          </motion.div>
        )}
        {selectedExpansionForQuiz && (
          <ExpansionQuizModal
            expansion={selectedExpansionForQuiz}
            onStart={(wordWithHanja) => {
              setSelectedExpansionForQuiz(null);
              setWord(wordWithHanja);
              handleAnalyze(wordWithHanja, true, false);
            }}
            onClose={() => setSelectedExpansionForQuiz(null)}
          />
        )}
        <AnimatePresence>
          {ambiguityCandidates && (
            <AmbiguityModal
              candidates={ambiguityCandidates}
              onSelect={(hanjaWithBracket) => {
                setAmbiguityCandidates(null);
                setWord(hanjaWithBracket);
                handleAnalyze(hanjaWithBracket, true, true);
              }}
              onClose={() => setAmbiguityCandidates(null)}
            />
          )}
        </AnimatePresence>

        {previewHanja && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
             <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewHanja(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <div className="w-full max-w-sm relative z-10">
              <HanjaCard 
                data={previewHanja}
                defaultExpanded={true}
                onWrite={(char, meaning, sound, originalSound) => {
                  setPreviewHanja(null);
                  setSelectedHanjaForWriting({ 
                    char, meaning, sound, originalSound, 
                    isReview: true 
                  });
                }}
                onQuiz={(h) => {
                  setPreviewHanja(null);
                  handleRequestQuiz(h);
                }}
              />
              <button 
                onClick={() => setPreviewHanja(null)}
                className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors flex items-center gap-2 font-black"
              >
                <X className="w-6 h-6" /> 닫기
              </button>
            </div>
          </div>
        )}
        {showBeadPopup && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBeadPopup(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="relative w-full max-w-xs bg-white rounded-[40px] p-8 shadow-2xl border-4 border-amber-100 flex flex-col items-center text-center"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 rounded-full flex items-center justify-center mb-6 shadow-lg ring-4 ring-amber-50">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-black text-duo-eel mb-4">여의주란 무엇인가요?</h3>
              <p className="text-duo-wolf font-bold leading-relaxed mb-8">
                여의주는 <span className="text-amber-600 font-black">연속 학습일 수</span>를 나타내요!<br/>
                매일매일 꾸준히 탐험해서 더 빛나는 여의주를 만들어보세요. 🐉✨
              </p>
              <button 
                onClick={() => setShowBeadPopup(false)}
                className="w-full py-4 bg-duo-macaw text-white rounded-2xl font-black text-base shadow-[0_4px_0_0_#1899d6] active:translate-y-1 active:shadow-none transition-all"
              >
                확인했어요!
              </button>
            </motion.div>
          </div>
        )}

        {showGiftPopup && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGiftPopup(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="relative w-full max-w-xs bg-white rounded-[40px] p-8 shadow-2xl border-4 border-duo-snow flex flex-col items-center text-center"
            >
              <div className="w-20 h-20 bg-amber-400 rounded-full flex items-center justify-center mb-6 shadow-lg ring-4 ring-amber-50">
                <Gift className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-black text-duo-eel mb-4">선물상자는 무엇인가요?</h3>
              <p className="text-duo-wolf font-bold leading-relaxed mb-8">
                한자 쓰기, 복습, 퀴즈 정답 등을 통해<br/>
                <span className="text-duo-macaw font-black">포인트를 적립</span>하면 선물상자를 받을 수 있어요! 🎁✨
              </p>
              <button 
                onClick={() => setShowGiftPopup(false)}
                className="w-full py-4 bg-duo-macaw text-white rounded-2xl font-black text-base shadow-[0_4px_0_0_#1899d6] active:translate-y-1 active:shadow-none transition-all"
              >
                확인했어요!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}

