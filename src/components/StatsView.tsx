"use client";

import { motion } from "framer-motion";
import { Trophy, Calendar, CheckCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsData {
  attendance: number;
  correctCount: number;
  totalLearned: number;
}

export default function StatsView({ stats, onClose }: { stats: StatsData; onClose: () => void }) {
  const getTrophyInfo = () => {
    if (stats.attendance >= 6) return { tier: "Gold", icon: "🥇", color: "text-yellow-500", bg: "bg-yellow-50" };
    if (stats.attendance >= 3) return { tier: "Silver", icon: "🥈", color: "text-gray-400", bg: "bg-gray-50" };
    if (stats.attendance >= 1) return { tier: "Bronze", icon: "🥉", color: "text-amber-600", bg: "bg-amber-50" };
    return { tier: "None", icon: "🌱", color: "text-duo-wolf", bg: "bg-duo-snow" };
  };

  const trophy = getTrophyInfo();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 bg-white flex flex-col p-6 overflow-y-auto"
    >
      <header className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-black text-duo-eel">주간 리캡</h2>
        <button onClick={onClose} className="p-2 bg-duo-snow rounded-full">
          <ArrowRight className="w-6 h-6" />
        </button>
      </header>

      <div className="space-y-6">
        {/* Trophy Card */}
        <div className={cn("p-8 rounded-3xl border-2 border-duo-swan flex flex-col items-center text-center", trophy.bg)}>
          <div className="text-7xl mb-4">{trophy.icon}</div>
          <h3 className={cn("text-2xl font-black mb-1", trophy.color)}>
            {trophy.tier === "None" ? "새싹 레벨" : `${trophy.tier} 트로피`}
          </h3>
          <p className="text-duo-wolf font-bold">이번 주에 {stats.attendance}일 출석했어요!</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border-2 border-duo-swan rounded-2xl p-6 shadow-sm">
            <Calendar className="w-8 h-8 text-duo-macaw mb-2" />
            <div className="text-2xl font-black text-duo-eel">{stats.attendance}일</div>
            <div className="text-sm font-bold text-duo-wolf uppercase">출석</div>
          </div>
          <div className="bg-white border-2 border-duo-swan rounded-2xl p-6 shadow-sm">
            <CheckCircle className="w-8 h-8 text-duo-green mb-2" />
            <div className="text-2xl font-black text-duo-eel">{stats.correctCount}개</div>
            <div className="text-sm font-bold text-duo-wolf uppercase">맞힌 문제</div>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="bg-white border-2 border-duo-swan rounded-3xl p-6">
          <h4 className="font-black text-duo-eel mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-duo-bee" /> 다음 트로피까지
          </h4>
          <div className="w-full h-4 bg-duo-swan rounded-full overflow-hidden mb-2">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((stats.attendance / 6) * 100, 100)}%` }}
              className="h-full bg-duo-bee"
            />
          </div>
          <p className="text-sm font-bold text-duo-wolf text-right">
            {stats.attendance}/6 일
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full h-16 bg-duo-green text-white rounded-2xl font-black text-xl shadow-duo-green active:translate-y-[4px] active:shadow-none transition-all mt-4"
        >
          계속 공부하기
        </button>
      </div>
    </motion.div>
  );
}
