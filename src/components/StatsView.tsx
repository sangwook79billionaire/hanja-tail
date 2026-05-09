"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Star, Target, ChevronLeft, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
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

export default function StatsView({ 
  stats, 
  logs,
  onClose,
  onReview,
  isAdmin,
  disabled = false
}: { 
  stats: StatsData; 
  logs: LearningLog[];
  onClose: () => void;
  onReview: (word: string) => void;
  isAdmin?: boolean;
  disabled?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabType>("today");

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

            {/* Total Word List - New Section */}
            <div className="bg-white border-2 border-duo-swan rounded-[32px] p-6 shadow-sm">
              <h3 className="text-lg font-black text-duo-eel mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-duo-macaw" /> 전체 단어 리스트
              </h3>
              <div className="space-y-4">
                {logs.length > 0 ? (
                  logs.map((log, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
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
                  <p className="text-center py-10 text-duo-wolf font-bold">학습한 단어가 없어요!</p>
                )}
              </div>
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

