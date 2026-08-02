"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Star, Target, ChevronLeft, Settings, Brain, AlertCircle, RefreshCw, ChevronRight, Activity, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { analyzeRecentErrors, getAIDiagnosis } from "@/app/actions";
import Link from "next/link";

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

type TabType = "today" | "weekly" | "monthly" | "total";

import LearningMindMap from "./LearningMindMap";

interface LearningLog {
  word: string;
  hanja?: string;
  is_correct: boolean;
  learned_at: string;
  practiced_writing?: boolean;
  parent_word?: string;
  meaning?: string;
  difficulty?: number;
}

interface MonitoringLog {
  id: string;
  message: string;
  created_at: string;
  level: string;
}

interface DiagnosisResponse {
  rootCause: string;
  proposedFix: string;
  prevention: string;
  severity: string;
}

interface SchoolRankData {
  rank: number | null;
  totalStudents: number | null;
  total_score: number;
}

export default function StatsView({ 
  stats, 
  logs,
  onClose,
  onReview,
  isAdmin,
  disabled = false,
  isLoggedIn,
  school,
  grade,
  schoolRank,
  onAuthClick,
  onRequiredInfoClick,
  onMyPageClick,
  allLogs
}: { 
  stats: StatsData; 
  logs: LearningLog[];
  onClose: () => void;
  onReview: (word: string) => void;
  isAdmin?: boolean;
  disabled?: boolean;
  isLoggedIn: boolean;
  school: string | null;
  grade: number | null;
  schoolRank: SchoolRankData | null;
  onAuthClick: () => void;
  onRequiredInfoClick: () => void;
  onMyPageClick: () => void;
  allLogs: LearningLog[];
}) {
  const [activeTab, setActiveTab] = useState<TabType>("today");
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<{ summary: string; logs: MonitoringLog[] } | null>(null);
  const [detailedDiagnosis, setDetailedDiagnosis] = useState<Record<string, DiagnosisResponse>>({});
  const [loadingErrorId, setLoadingErrorId] = useState<string | null>(null);

  const handleRunDiagnosis = async () => {
    setIsDiagnosing(true);
    try {
      const result = await analyzeRecentErrors();
      if ("error" in result) {
        alert(result.error);
      } else {
        setDiagnosisResult(result as { summary: string; logs: MonitoringLog[] });
      }
    } catch {
      alert("진단 중 오류가 발생했습니다.");
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleGetDetailedDiagnosis = async (logId: string, message: string) => {
    setLoadingErrorId(logId);
    try {
      const result = await getAIDiagnosis(message);
      if ("error" in result) throw new Error();
      setDetailedDiagnosis(prev => ({ ...prev, [logId]: result as DiagnosisResponse }));
    } catch {
      alert("상세 진단 실패");
    } finally {
      setLoadingErrorId(null);
    }
  };

  if (!stats || !stats.total) {
    return (
      <div className="fixed inset-0 z-[400] bg-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-duo-wolf font-black mb-4">학습 데이터를 불러오지 못했어요.</p>
        <button onClick={onClose} className="px-6 py-3 bg-duo-macaw text-white rounded-2xl font-black">
          돌아가기
        </button>
      </div>
    );
  }

  const currentStats = stats[activeTab] || { count: 0, correct: 0, days: 0 };

  const filteredPeriodLogs = (() => {
    if (activeTab === "today") return logs;
    const now = new Date();
    return allLogs.filter(log => {
      const logDate = new Date(log.learned_at);
      if (activeTab === "weekly") {
        const limit = new Date();
        limit.setDate(now.getDate() - 7);
        return logDate >= limit;
      }
      if (activeTab === "monthly") {
        const limit = new Date();
        limit.setMonth(now.getMonth() - 1);
        return logDate >= limit;
      }
      return true; // 'total'
    });
  })();

  const getTrophyInfo = () => {
    const days = stats.total.days;
    if (days >= 30) return { tier: "Diamond", icon: "💎", color: "text-blue-400", bg: "bg-blue-50" };
    if (days >= 15) return { tier: "Gold", icon: "🥇", color: "text-yellow-500", bg: "bg-yellow-50" };
    if (days >= 7) return { tier: "Silver", icon: "🥈", color: "text-gray-400", bg: "bg-gray-50" };
    if (days >= 1) return { tier: "Bronze", icon: "🥉", color: "text-amber-600", bg: "bg-amber-50" };
    return { tier: "None", icon: "🌱", color: "text-duo-wolf", bg: "bg-duo-snow" };
  };

  const trophy = getTrophyInfo();

  const tabs: { id: TabType; label: string }[] = [
    { id: "today", label: "오늘 기록" },
    { id: "weekly", label: "주간" },
    { id: "monthly", label: "월간" },
    { id: "total", label: "전체" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: "100%" }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[400] bg-white flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between mt-4 mb-2 px-2">
        <button onClick={onClose} className="p-2 hover:bg-duo-snow rounded-xl transition-colors">
          <ChevronLeft className="w-8 h-8 text-duo-eel" />
        </button>
        <h2 className="text-xl font-black text-duo-eel">나의 탐험 리포트</h2>
        {isAdmin ? (
          <Link href="/admin" className="p-2 hover:bg-duo-snow rounded-xl transition-colors">
            <Settings className="w-8 h-8 text-duo-macaw" />
          </Link>
        ) : (
          <div className="w-12 h-12" />
        )}
      </div>

      {/* Tabs */}
      <div className="px-6 py-4 bg-white border-b-2 border-duo-snow">
        <div className="flex bg-duo-snow p-1 rounded-2xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 py-2 text-sm font-black rounded-xl transition-all",
                activeTab === tab.id 
                  ? "bg-white text-duo-macaw shadow-sm" 
                  : "text-duo-wolf hover:text-duo-eel"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-duo-snow/30">
        {/* School Rank Card */}
        <div className="flex flex-col items-center">
          {!isLoggedIn ? (
            <div 
              onClick={onAuthClick}
              className="flex flex-col items-center gap-1.5 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-100/70 px-8 py-5 rounded-[28px] shadow-sm text-center w-full max-w-md cursor-pointer hover:bg-indigo-100/30 transition-all"
            >
              <span className="text-xs font-black uppercase tracking-wider text-indigo-600/80 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-indigo-400" /> 나의 학교/학년 순위
              </span>
              <span className="text-base font-black text-indigo-900 mt-1">로그인하고 학교 순위를 확인해보자! 🏫</span>
              <span className="text-[10px] text-duo-wolf font-bold">친구들과 함께 즐겁게 경쟁해봐요!</span>
            </div>
          ) : (!school || !grade || !schoolRank || schoolRank.rank === null) ? (
            <div 
              onClick={onRequiredInfoClick}
              className="flex flex-col items-center gap-1.5 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-100/70 px-8 py-5 rounded-[28px] shadow-sm text-center w-full max-w-md cursor-pointer hover:bg-indigo-100/30 transition-all"
            >
              <span className="text-xs font-black uppercase tracking-wider text-indigo-600/80 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-indigo-400" /> 나의 학교/학년 순위
              </span>
              <span className="text-base font-black text-indigo-900 mt-1">학교와 학년을 입력하고 순위를 확인해보세요! 🏫</span>
              <span className="text-[10px] text-duo-wolf font-bold">눌러서 소속 정보를 입력하기</span>
            </div>
          ) : (
            <div 
              onClick={onMyPageClick}
              className="flex flex-col items-center gap-1.5 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-100/70 px-8 py-5 rounded-[28px] shadow-sm text-center w-full max-w-md cursor-pointer hover:bg-indigo-100/30 transition-all"
            >
              <span className="text-xs font-black uppercase tracking-wider text-indigo-600/80 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-500" /> {school} {grade}학년 순위
              </span>
              {(() => {
                const total = schoolRank.totalStudents ?? 1;
                const rank = schoolRank.rank ?? 1;
                const pct = Math.max(10, Math.min(100, Math.round(((total - rank + 1) / total) * 100)));
                const topPercent = Math.round((rank / total) * 100);
                return (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-black text-indigo-700">전체 {total}명 중</span>
                      <span className="text-3xl font-black text-indigo-900">{rank}</span>
                      <span className="text-sm font-black text-indigo-700">위</span>
                    </div>
                    <div className="w-full bg-indigo-100/50 h-2.5 rounded-full overflow-hidden mt-1.5">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-duo-wolf font-bold mt-1">
                      나의 총점: {schoolRank.total_score}점 (상위 {topPercent}% 🏆)
                    </span>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {activeTab === "today" ? (
          <>
            <div className="bg-white border-2 border-duo-swan rounded-[32px] p-6 shadow-sm">
              <h3 className="text-lg font-black text-duo-eel mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-duo-macaw" /> 오늘의 한자 마인드맵
              </h3>
              <p className="text-xs font-bold text-duo-wolf mb-6">
                단어를 클릭해서 복습하면 추가 보너스 점수(+0.5)를 받을 수 있어요!
              </p>
              <LearningMindMap logs={logs} onReview={onReview} disabled={disabled} />
            </div>
            {/* Daily Point Progress */}
            <div className="bg-duo-bee/10 border-2 border-duo-bee/30 rounded-3xl p-6">
              <h4 className="font-black text-duo-bee-dark mb-4 flex items-center gap-2">
                💰 오늘의 보너스 점수 현황
              </h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-black text-duo-wolf mb-1">
                    <span>새로운 단어 (최대 5점)</span>
                    <span>{stats.today.count}/5 점</span>
                  </div>
                  <div className="h-2 bg-duo-snow rounded-full overflow-hidden">
                    <div className="h-full bg-duo-macaw" style={{ width: `${(stats.today.count / 5) * 100}%` }} />
                  </div>
                </div>
                <p className="text-[10px] font-bold text-duo-wolf">
                  * 복습 점수는 최대 10점까지 하루 총 15점 획득 가능!
                </p>
              </div>
            </div>

            {/* Admin AI Diagnosis Section */}
            {isAdmin && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-100 rounded-[32px] p-8 shadow-sm mt-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-black text-indigo-900 flex items-center gap-2">
                      <Brain className="w-6 h-6 text-indigo-500" /> AI 시스템 진단 센터
                    </h3>
                    <p className="text-sm font-bold text-indigo-600/70 mt-1">
                      최근 발생한 오류를 AI가 자동으로 분석합니다.
                    </p>
                  </div>
                  <button 
                    onClick={handleRunDiagnosis}
                    disabled={isDiagnosing}
                    className="p-3 bg-white text-indigo-500 rounded-2xl shadow-sm border-2 border-indigo-100 hover:bg-indigo-50 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={cn("w-6 h-6", isDiagnosing && "animate-spin")} />
                  </button>
                </div>

                {!diagnosisResult ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-white/50 rounded-3xl border-2 border-dashed border-indigo-200">
                    <Activity className="w-12 h-12 text-indigo-200 mb-4" />
                    <button 
                      onClick={handleRunDiagnosis}
                      disabled={isDiagnosing}
                      className="px-8 py-4 bg-indigo-500 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isDiagnosing ? "AI 분석 중..." : "시스템 정밀 진단 시작"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border-2 border-indigo-100 shadow-sm">
                      <h4 className="font-black text-indigo-900 mb-3 flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-400" /> AI 종합 진단 리포트
                      </h4>
                      <div className="text-sm font-bold text-indigo-800/80 leading-relaxed whitespace-pre-wrap">
                        {diagnosisResult.summary}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-black text-indigo-900 flex items-center gap-2 px-2">
                        <AlertCircle className="w-4 h-4 text-rose-500" /> 감지된 주요 이슈 ({diagnosisResult.logs.length})
                      </h4>
                      {diagnosisResult.logs.map((log: MonitoringLog) => (
                        <div key={log.id} className="bg-white rounded-3xl border-2 border-indigo-50 overflow-hidden">
                          <div className="p-5 flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">ERROR</span>
                                <span className="text-[10px] font-bold text-indigo-300">{new Date(log.created_at).toLocaleString()}</span>
                              </div>
                              <p className="text-sm font-black text-indigo-950 line-clamp-2">{log.message}</p>
                            </div>
                            <button 
                              onClick={() => handleGetDetailedDiagnosis(log.id, log.message)}
                              disabled={loadingErrorId === log.id}
                              className="p-2 bg-indigo-50 text-indigo-500 rounded-xl hover:bg-indigo-100 transition-all disabled:opacity-50"
                            >
                              {loadingErrorId === log.id ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                            </button>
                          </div>

                          {detailedDiagnosis[log.id] && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              className="px-5 pb-5 border-t border-indigo-50 bg-indigo-50/30"
                            >
                              <div className="pt-4 space-y-4">
                                <div>
                                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">Root Cause</span>
                                  <p className="text-sm font-bold text-indigo-900 mt-1">{detailedDiagnosis[log.id].rootCause}</p>
                                </div>
                                <div>
                                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">Proposed Fix</span>
                                  <div className="mt-2 p-4 bg-slate-900 rounded-2xl text-[11px] font-mono text-slate-100 overflow-x-auto border-4 border-slate-800">
                                    <pre className="whitespace-pre-wrap">{detailedDiagnosis[log.id].proposedFix}</pre>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                  <span className="text-[10px] font-black px-2 py-1 bg-amber-400 text-white rounded-full">Severity: {detailedDiagnosis[log.id].severity}</span>
                                  <p className="text-[10px] font-bold text-indigo-500">Prevention: {detailedDiagnosis[log.id].prevention}</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Trophy Section */}
            <section className={cn("p-8 rounded-3xl border-2 border-duo-swan flex flex-col items-center text-center shadow-sm", trophy.bg)}>
              <motion.div 
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                className="text-7xl mb-4 drop-shadow-md"
              >
                {trophy.icon}
              </motion.div>
              <h3 className={cn("text-2xl font-black mb-1", trophy.color)}>
                {trophy.tier === "None" ? "새싹 탐험가" : `${trophy.tier} 등급`}
              </h3>
              <p className="text-duo-wolf font-bold">총 {stats.total.days}일 동안 한자를 탐험했어요!</p>
            </section>

            {/* Period Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div 
                key={`${activeTab}-count`}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white border-2 border-duo-swan rounded-2xl p-6 shadow-sm"
              >
                <Target className="w-8 h-8 text-duo-macaw mb-2" />
                <div className="text-3xl font-black text-duo-eel">{currentStats.count}개</div>
                <div className="text-xs font-bold text-duo-wolf uppercase tracking-wider">학습한 단어</div>
              </motion.div>
              <motion.div 
                key={`${activeTab}-correct`}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white border-2 border-duo-swan rounded-2xl p-6 shadow-sm"
              >
                <Star className="w-8 h-8 text-duo-bee mb-2" />
                <div className="text-3xl font-black text-duo-eel">
                  {currentStats.count > 0 ? Math.round((currentStats.correct / currentStats.count) * 100) : 0}%
                </div>
                <div className="text-xs font-bold text-duo-wolf uppercase tracking-wider">정답률</div>
              </motion.div>
            </div>

            {/* Difficulty Distribution Section */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white border-2 border-duo-swan rounded-[32px] p-6 shadow-sm"
            >
              <h3 className="text-lg font-black text-duo-eel mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-500" /> 한자 난이도 분포
              </h3>
              
              {(() => {
                const filteredLogs = logs.filter(log => {
                  if (activeTab === 'total') return true;
                  const logDate = new Date(log.learned_at);
                  const now = new Date();
                  if (activeTab === 'weekly') {
                    const weekAgo = new Date();
                    weekAgo.setDate(now.getDate() - 7);
                    return logDate >= weekAgo;
                  }
                  if (activeTab === 'monthly') {
                    const monthAgo = new Date();
                    monthAgo.setMonth(now.getMonth() - 1);
                    return logDate >= monthAgo;
                  }
                  return true;
                });

                const dist = { 1: 0, 2: 0, 3: 0 };
                filteredLogs.forEach(l => {
                  const d = (l.difficulty || 1) as 1 | 2 | 3;
                  if (dist[d] !== undefined) dist[d]++;
                });
                
                const total = filteredLogs.length || 1;

                return (
                  <div className="space-y-6">
                    {[
                      { level: 1, label: "초급 (1-2학년)", color: "bg-duo-green", count: dist[1] },
                      { level: 2, label: "중급 (3-4학년)", color: "bg-duo-macaw", count: dist[2] },
                      { level: 3, label: "고급 (5학년 이상)", color: "bg-purple-500", count: dist[3] },
                    ].map((item) => (
                      <div key={item.level} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-black text-duo-eel">{item.label}</span>
                          <span className="text-xs font-bold text-duo-wolf">{item.count}개</span>
                        </div>
                        <div className="h-4 bg-duo-snow rounded-full overflow-hidden border border-duo-snow">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(item.count / total) * 100}%` }}
                            className={cn("h-full", item.color)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </motion.div>

            {/* Detailed List Card */}
            <div className="bg-white border-2 border-duo-swan rounded-3xl p-6 shadow-sm">
              <h4 className="font-black text-duo-eel mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-duo-macaw" /> {activeTab === "total" ? "누적 성과" : "기간 상세 기록"}
              </h4>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b-2 border-duo-snow">
                  <span className="font-bold text-duo-wolf">탐험 일수</span>
                  <span className="font-black text-duo-eel">{currentStats.days}일</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b-2 border-duo-snow">
                  <span className="font-bold text-duo-wolf">맞힌 문제</span>
                  <span className="font-black text-duo-green">{currentStats.correct}문제</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="font-bold text-duo-wolf">연속 출석</span>
                  <span className="font-black text-duo-macaw">{stats.total.days}일째</span>
                </div>
              </div>
            </div>

            {/* Next Goal */}
            <div className="bg-duo-eel text-white rounded-3xl p-6 shadow-lg">
              <h4 className="font-black mb-4 flex items-center gap-2">
                🚀 다음 목표까지
              </h4>
              <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden mb-3">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((stats.total.days / 7) * 100, 100)}%` }}
                  className="h-full bg-duo-green"
                />
              </div>
              <p className="text-sm font-bold text-white/80">
                {stats.total.days >= 7 ? "주간 마스터를 달성했어요!" : `앞으로 ${7 - (stats.total.days % 7)}일만 더 출석하면 다음 트로피!`}
              </p>
            </div>
          </>
        )}

        {/* Word List Section - Rendered dynamically at the bottom for all tabs */}
        <div className="bg-white border-2 border-duo-swan rounded-[32px] p-6 shadow-sm">
          <h3 className="text-lg font-black text-duo-eel mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-duo-macaw" /> {
              activeTab === "today" ? "오늘 학습한 단어" :
              activeTab === "weekly" ? "이번 주 학습한 단어" :
              activeTab === "monthly" ? "이번 달 학습한 단어" :
              "그동안 배운 단어 리스트"
            }
          </h3>
          <div className="space-y-4">
            {filteredPeriodLogs.length > 0 ? (
              filteredPeriodLogs.map((log, idx) => (
                <motion.div 
                  key={`${activeTab}-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.4) }}
                  className="flex items-center justify-between p-4 bg-duo-snow/30 rounded-2xl border-2 border-duo-snow group hover:border-duo-macaw transition-all cursor-pointer"
                  onClick={() => onReview(log.word)}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-duo-eel">{log.word}</span>
                      {log.hanja && (
                        <span className="text-sm font-bold text-duo-wolf bg-white px-2 py-0.5 rounded-lg border border-duo-snow">
                          {log.hanja}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-duo-wolf line-clamp-1">{log.meaning || "뜻 정보 없음"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {log.practiced_writing && (
                      <div className="bg-duo-green/10 text-duo-green px-2 py-1 rounded-lg text-[10px] font-black border border-duo-green/20">
                        쓰기 완료
                      </div>
                    )}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      log.is_correct ? "bg-duo-green text-white" : "bg-duo-snow text-duo-swan"
                    )}>
                      <Target className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-center py-10 text-duo-wolf font-bold">이 기간 동안 학습한 단어가 없어요!</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="p-6 bg-white border-t-2 border-duo-snow">
        <button
          onClick={onClose}
          className="w-full h-14 bg-duo-macaw text-white rounded-2xl font-black text-lg shadow-[0_4px_0_0_#1a98d9] active:translate-y-[4px] active:shadow-none transition-all"
        >
          탐험 계속하기
        </button>
      </div>
    </motion.div>
  );
}

