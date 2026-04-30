"use client";

import { useEffect, useState } from "react";
import { getLearningRecap } from "@/app/actions";
import { Trophy, ChevronLeft, Calendar, CheckCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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

export default function TrophyPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const result = await getLearningRecap();
      if (result.stats) {
        setStats(result.stats as StatsData);
      }
      setIsLoading(false);
    }
    fetchStats();
  }, []);

  const getTrophyInfo = (attendance: number) => {
    if (attendance >= 6) return { tier: "Gold", icon: "🥇", color: "text-yellow-500", label: "황금 트로피" };
    if (attendance >= 3) return { tier: "Silver", icon: "🥈", color: "text-gray-400", label: "은빛 트로피" };
    if (attendance >= 1) return { tier: "Bronze", icon: "🥉", color: "text-amber-600", label: "동빛 트로피" };
    return { tier: "None", icon: "🌱", color: "text-duo-wolf", label: "도전 중" };
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="w-12 h-12 border-4 border-duo-green/30 border-t-duo-green rounded-full animate-spin" />
    </div>
  );

  const attendance = stats?.weekly?.days || 0;
  const correctCount = stats?.weekly?.correct || 0;
  const trophy = getTrophyInfo(attendance);

  return (
    <div className="flex flex-col min-h-screen bg-duo-snow">
      <header className="bg-white border-b-2 border-duo-swan p-6 flex items-center gap-4">
        <Link href="/" className="p-2 hover:bg-duo-snow rounded-xl transition-colors">
          <ChevronLeft className="w-8 h-8 text-duo-wolf" />
        </Link>
        <h1 className="text-2xl font-black text-duo-eel">마이 트로피</h1>
      </header>

      <main className="p-6 space-y-6">
        {/* Trophy Case Section */}
        <section className="bg-white border-2 border-duo-swan rounded-3xl p-8 flex flex-col items-center text-center shadow-sm">
          <div className="text-8xl mb-6 filter drop-shadow-lg animate-bounce duration-2000">
            {trophy.icon}
          </div>
          <h2 className={cn("text-3xl font-black mb-2", trophy.color)}>
            {trophy.label}
          </h2>
          <p className="text-duo-wolf font-bold mb-6">
            이번 주 {attendance}일 동안 열심히 공부했어요!
          </p>
          
          <div className="w-full h-4 bg-duo-swan rounded-full overflow-hidden">
            <div 
              className="h-full bg-duo-bee transition-all duration-1000"
              style={{ width: `${Math.min((attendance / 6) * 100, 100)}%` }}
            />
          </div>
          <div className="w-full flex justify-between mt-2 text-xs font-black text-duo-wolf uppercase">
            <span>START</span>
            <span>GOAL (6 DAYS)</span>
          </div>
        </section>

        {/* Detailed Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border-2 border-duo-swan rounded-2xl p-6">
            <Calendar className="w-6 h-6 text-duo-macaw mb-2" />
            <div className="text-2xl font-black text-duo-eel">{attendance}일</div>
            <p className="text-xs font-bold text-duo-wolf uppercase">이번 주 출석</p>
          </div>
          <div className="bg-white border-2 border-duo-swan rounded-2xl p-6">
            <CheckCircle className="w-6 h-6 text-duo-green mb-2" />
            <div className="text-2xl font-black text-duo-eel">{correctCount}개</div>
            <p className="text-xs font-bold text-duo-wolf uppercase">맞힌 퀴즈</p>
          </div>
        </div>

        {/* Reward History Placeholder */}
        <section className="bg-white border-2 border-duo-swan rounded-3xl p-6">
          <h3 className="text-lg font-black text-duo-eel mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-duo-bee" /> 지난 보상 기록
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-duo-snow rounded-2xl border-2 border-dashed border-duo-swan">
              <div className="text-2xl grayscale opacity-50">🥇</div>
              <div className="flex-1">
                <div className="h-4 bg-duo-swan/50 rounded-full w-3/4 mb-2"></div>
                <div className="h-3 bg-duo-swan/30 rounded-full w-1/2"></div>
              </div>
            </div>
            <p className="text-center text-sm font-bold text-duo-wolf py-4">
              기록을 쌓아서 진열장을 가득 채워보세요!
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
