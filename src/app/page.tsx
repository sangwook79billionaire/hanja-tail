"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getLearningRecap, getMyProfile, getSchoolRank, getRecommendedWord } from "./actions";
import { normalizeWordWithHanja } from "@/lib/wordUtils";
import { createClient } from "@/lib/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";

import StatsView from "@/components/StatsView";
import MyPageModal from "@/components/MyPageModal";
import AuthModal from "@/components/AuthModal";
import RequiredInfoModal from "@/components/RequiredInfoModal";
import WordFlow from "@/components/learn/WordFlow";

import { Button } from "@/components/ui/Button";
import { SearchInput, Chip, WordCard } from "@/components/ui/Search";
import { TopNavStats, StatCard, DailyProgress, type DailyWordSlot } from "@/components/ui/Stats";
import { TabBar, type TabKey } from "@/components/ui/Navigation";
import { UnitBanner } from "@/components/ui/LearningPath";
import { Hero } from "@/components/ui/Hero";
import { NoriIcon } from "@/components/ui/NoriIcon";

interface LearningLog {
  word: string;
  hanja?: string;
  is_correct: boolean;
  learned_at: string;
  viewed_stroke?: boolean;
  practiced_writing?: boolean;
  meaning?: string;
  difficulty?: number;
  hanjaDetails?: { char: string; meaning: string; sound: string; level?: string }[];
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

interface SchoolRankData {
  school: string | null;
  grade: number | null;
  rank: number | null;
  totalStudents: number | null;
  total_score: number;
}

interface Recommended {
  word: string;
  hanja_combination: string;
  description: string;
}

const DAILY_GOAL = 3;
const DAILY_NEW_WORD_LIMIT = 5;
const RECENT_KEY = "nori_recent_searches";

const kstDay = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/** 같은 단어의 여러 기록을 하나로 합칩니다 (최근 순) */
function mergeLogs(logs: LearningLog[]) {
  const map = new Map<string, LearningLog>();
  logs.forEach((log) => {
    const existing = map.get(log.word);
    if (!existing) {
      map.set(log.word, { ...log });
      return;
    }
    existing.is_correct = existing.is_correct || log.is_correct;
    existing.viewed_stroke = existing.viewed_stroke || log.viewed_stroke;
    existing.practiced_writing = existing.practiced_writing || log.practiced_writing;
    if (new Date(log.learned_at) > new Date(existing.learned_at)) existing.learned_at = log.learned_at;
  });
  return Array.from(map.values()).sort((a, b) => new Date(b.learned_at).getTime() - new Date(a.learned_at).getTime());
}

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((w) => typeof w === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}

function writeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* 저장 공간을 못 쓰면 이번 화면에서만 유지 */
  }
}

export default function HomePage() {
  const supabase = useMemo(() => createClient(), []);

  const [tab, setTab] = useState<TabKey>("learn");
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [school, setSchool] = useState<string | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [streakCount, setStreakCount] = useState(0);
  const [schoolRank, setSchoolRank] = useState<SchoolRankData | null>(null);

  const [dailyHistory, setDailyHistory] = useState<LearningLog[]>([]);
  const [allHistory, setAllHistory] = useState<LearningLog[]>([]);
  const [recapData, setRecapData] = useState<StatsData | null>(null);
  /** 로그인 전에도 이번 접속에서 익힌 단어를 보여 주기 위한 목록 */
  const [sessionLearned, setSessionLearned] = useState<DailyWordSlot[]>([]);

  const [recent, setRecent] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [recommended, setRecommended] = useState<Recommended | null>(null);

  const [flow, setFlow] = useState<{ open: boolean; initialWord?: string; key: number }>({ open: false, key: 0 });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showRequiredInfoModal, setShowRequiredInfoModal] = useState(false);
  const [showMyPageModal, setShowMyPageModal] = useState(false);

  /* ── 데이터 불러오기 (기존과 같은 서버 함수) ── */
  const fetchDailyHistory = useCallback(async () => {
    const result = await getLearningRecap();
    if (!result.logs) return;
    const today = kstDay(new Date());
    setDailyHistory(mergeLogs(result.logs.filter((log: LearningLog) => kstDay(new Date(log.learned_at)) === today)));
    setAllHistory(mergeLogs(result.logs));
    if (result.stats) setRecapData(result.stats as unknown as StatsData);
  }, []);

  const fetchProfile = useCallback(async () => {
    const { profile } = await getMyProfile();
    if (!profile) return;
    setNickname(profile.nickname);
    setSchool(profile.school);
    setGrade(profile.grade);
    setStreakCount(profile.streak_count || 0);
    if (!profile.school || !profile.grade) setShowRequiredInfoModal(true);
    getSchoolRank().then(setSchoolRank);
  }, []);

  useEffect(() => {
    setRecent(readRecent());
    getRecommendedWord().then((r) => r && setRecommended(r));
  }, []);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchDailyHistory();
    } else {
      setNickname(null);
      setDailyHistory([]);
      setAllHistory([]);
      setRecapData(null);
      setStreakCount(0);
      setSchoolRank(null);
    }
  }, [user, fetchProfile, fetchDailyHistory]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, [supabase]);

  /* ── 오늘의 단어 ── */
  const todayLearned: DailyWordSlot[] = useMemo(() => {
    const fromLogs = dailyHistory
      .filter((log) => log.practiced_writing)
      .map((log) => {
        const { baseWord, targetHanja } = normalizeWordWithHanja(log.word);
        return { word: baseWord, hanja: log.hanja || targetHanja || "" };
      });
    const seen = new Set(fromLogs.map((w) => w.word));
    const extra = sessionLearned.filter((w) => !seen.has(w.word));
    return [...fromLogs, ...extra].reverse();
  }, [dailyHistory, sessionLearned]);

  const todayExplored = useMemo(
    () =>
      dailyHistory.map((log) => {
        const { baseWord, targetHanja } = normalizeWordWithHanja(log.word);
        const hanja = log.hanja || targetHanja || "";
        return { log, baseWord, hanja, target: hanja ? `${baseWord}(${hanja})` : baseWord };
      }),
    [dailyHistory]
  );

  const blockReason =
    (recapData?.today?.count || 0) >= DAILY_NEW_WORD_LIMIT
      ? `오늘의 새 단어(${DAILY_NEW_WORD_LIMIT}개)를 모두 찾았어요! 내일 또 새로운 단어를 찾아봐요.`
      : null;

  const openFlow = (initialWord?: string) => setFlow((f) => ({ open: true, initialWord, key: f.key + 1 }));

  const addRecent = useCallback((word: string) => {
    setRecent((prev) => {
      const next = [word, ...prev.filter((w) => w !== word)].slice(0, 8);
      writeRecent(next);
      return next;
    });
  }, []);

  const removeRecent = (word: string) =>
    setRecent((prev) => {
      const next = prev.filter((w) => w !== word);
      writeRecent(next);
      return next;
    });

  const handleSearched = useCallback(
    (formatted: string) => {
      addRecent(normalizeWordWithHanja(formatted).baseWord);
      if (user) fetchDailyHistory();
    },
    [addRecent, user, fetchDailyHistory]
  );

  const handleLearned = useCallback(
    async (word: string, hanja: string) => {
      setSessionLearned((prev) => (prev.some((w) => w.word === word) ? prev : [...prev, { word, hanja }]));
      if (user) await Promise.all([fetchDailyHistory(), fetchProfile()]);
    },
    [user, fetchDailyHistory, fetchProfile]
  );

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-nori-surface">
      <div className="sticky top-0 z-30">
        <TopNavStats subject="漢" streak={streakCount} />
      </div>

      <div className="flex-1 pb-6">
        {/* ── 학습 (오늘의 목표) ── */}
        {tab === "learn" && (
          <div className="flex flex-col gap-4 px-[22px] pt-2">
            <UnitBanner
              eyebrow={nickname ? `${nickname}님의 오늘 목표` : "오늘의 목표"}
              title={`새 단어 ${DAILY_GOAL}개 익히기`}
            />
            <DailyProgress words={todayLearned} goal={DAILY_GOAL} />
            <div className="flex items-center gap-1">
              <Hero blob="mint" character="dori-explorer" characterHeight={92} width={140} height={108} />
              <p className="flex-1 text-[22px] font-bold leading-[30px] tracking-[-0.22px] text-nori-primary">
                {todayLearned.length >= DAILY_GOAL ? (
                  <>
                    오늘 목표 달성!
                    <br />더 찾아볼까요?
                  </>
                ) : (
                  <>
                    궁금한 단어를
                    <br />
                    같이 찾아봐요!
                  </>
                )}
              </p>
            </div>
            <Button onClick={() => openFlow()}>단어 찾으러 가기</Button>

            {todayExplored.length > 0 && (
              <section className="mt-2 flex flex-col gap-3">
                <h2 className="text-lg font-bold leading-[26px] tracking-[-0.18px] text-nori-primary">오늘 찾은 단어</h2>
                {todayExplored.map(({ log, baseWord, hanja, target }) => (
                  <WordCard
                    key={log.word}
                    hanja={hanja.charAt(0) || baseWord.charAt(0)}
                    word={hanja ? `${baseWord} (${hanja})` : baseWord}
                    meaning={log.meaning || "뜻을 불러오는 중이에요"}
                    added={!!log.practiced_writing}
                    actionLabel="이어서 쓰기"
                    doneLabel="✓ 익힘"
                    onAdd={() => openFlow(target)}
                  />
                ))}
              </section>
            )}

            {!user && (
              <div className="mt-2 flex flex-col items-center gap-3 rounded-nori-lg border-2 border-nori-border bg-nori-subtle p-5 text-center">
                <p className="text-base font-medium leading-6 tracking-[-0.16px] text-nori-secondary">
                  로그인하면 익힌 단어와 연속 학습 기록이 저장돼요
                </p>
                <Button variant="secondary" size="sm" onClick={() => setIsAuthModalOpen(true)}>
                  로그인 / 회원가입
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── 검색 (H02) ── */}
        {tab === "search" && (
          <div className="flex flex-col gap-4 px-[22px] pt-3">
            <h1 className="text-[26px] font-bold leading-[34px] tracking-[-0.26px] text-nori-strong">단어 검색</h1>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchInput.trim()) openFlow(searchInput.trim());
              }}
            >
              <SearchInput
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="궁금한 단어를 검색해 보세요"
                enterKeyHint="search"
              />
            </form>
            {recent.length > 0 && (
              <>
                <h2 className="text-lg font-bold leading-[26px] tracking-[-0.18px] text-nori-primary">최근 검색</h2>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {recent.map((w) => (
                    <Chip key={w} label={w} onClick={() => openFlow(w)} onRemove={() => removeRecent(w)} />
                  ))}
                </div>
              </>
            )}
            {recommended && (
              <>
                <h2 className="text-lg font-bold leading-[26px] tracking-[-0.18px] text-nori-primary">오늘의 추천 단어</h2>
                <WordCard
                  hanja={recommended.hanja_combination.charAt(0)}
                  word={`${recommended.word} (${recommended.hanja_combination})`}
                  meaning={recommended.description}
                  actionLabel="+ 배우기"
                  onAdd={() => openFlow(`${recommended.word}(${recommended.hanja_combination})`)}
                />
              </>
            )}
          </div>
        )}

        {/* ── 복습 (기존 기록 화면을 그대로 사용, 3단계에서 Nori 디자인으로 교체 예정) ── */}
        {tab === "review" &&
          (recapData ? (
            <div className="px-4 pt-4">
              <StatsView
                stats={recapData}
                logs={dailyHistory}
                allLogs={allHistory}
                onClose={() => setTab("learn")}
                onReview={(w) => openFlow(w)}
                isLoggedIn={!!user}
                school={school}
                grade={grade}
                schoolRank={schoolRank}
                onAuthClick={() => setIsAuthModalOpen(true)}
                onRequiredInfoClick={() => setShowRequiredInfoModal(true)}
                onMyPageClick={() => setShowMyPageModal(true)}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 px-[22px] pt-16 text-center">
              <Hero blob="rose" character="dori-positive" characterHeight={92} width={160} height={120} />
              <p className="text-lg font-bold leading-[26px] text-nori-primary">
                {user ? "기록을 불러오고 있어요" : "로그인하면 익힌 단어를 복습할 수 있어요"}
              </p>
              {!user && (
                <Button size="sm" onClick={() => setIsAuthModalOpen(true)}>
                  로그인 / 회원가입
                </Button>
              )}
            </div>
          ))}

        {/* ── 마이 ── */}
        {tab === "profile" && (
          <div className="flex flex-col gap-4 px-[22px] pt-3">
            <div className="flex items-center gap-4">
              <Hero blob="mint-lg" character="dori-scholar" characterHeight={110} width={130} height={124} />
              <div className="min-w-0">
                <p className="truncate text-[26px] font-bold leading-[34px] tracking-[-0.26px] text-nori-strong">
                  {nickname ?? "노리 친구"}
                </p>
                {school && (
                  <p className="text-sm font-medium leading-5 text-nori-secondary">
                    {school}
                    {grade ? ` · ${grade}학년` : ""}
                  </p>
                )}
              </div>
            </div>
            {user ? (
              <>
                <div className="flex gap-2.5">
                  <StatCard icon={<NoriIcon name="flame" />} value={`${streakCount}일`} label="연속 학습" />
                  <StatCard
                    icon={
                      <span className="flex size-[23px] items-center justify-center rounded-full bg-nori-brand">
                        <NoriIcon name="star" size={15} />
                      </span>
                    }
                    value={`${Math.min(todayLearned.length, DAILY_GOAL)}/${DAILY_GOAL}`}
                    label="오늘의 단어"
                  />
                  <StatCard
                    icon={
                      <span className="flex size-[23px] items-center justify-center rounded-full bg-nori-success">
                        <NoriIcon name="check" size={15} />
                      </span>
                    }
                    value={`${recapData?.total?.days ?? 0}일`}
                    label="학습한 날"
                  />
                </div>
                <Button variant="secondary" onClick={() => setShowMyPageModal(true)}>
                  내 정보 수정
                </Button>
                <Button variant="secondary" onClick={signOut}>
                  로그아웃
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsAuthModalOpen(true)}>로그인 / 회원가입</Button>
            )}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-30">
        <TabBar active={tab} onChange={setTab} />
      </div>

      {flow.open && (
        <WordFlow
          key={flow.key}
          initialWord={flow.initialWord}
          recentWords={recent}
          onRemoveRecent={removeRecent}
          blockReason={blockReason}
          isLoggedIn={!!user}
          streak={streakCount}
          todayWords={todayLearned}
          dailyGoal={DAILY_GOAL}
          onSearched={handleSearched}
          onLearned={handleLearned}
          onExit={() => setFlow((f) => ({ ...f, open: false }))}
        />
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
    </div>
  );
}
