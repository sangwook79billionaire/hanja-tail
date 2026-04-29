"use client";

import { useState, useEffect } from "react";
import { getAdminStats } from "../actions";
import { Users, BookOpen, Trophy, ArrowLeft, Clock, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface AdminStats {
  totalUsers: number;
  totalLogs: number;
}

interface RankingItem {
  nickname: string | null;
  total_score: number;
  current_stage: number;
}

interface ActivityLog {
  word: string;
  is_correct: boolean;
  learned_at: string;
  profiles: {
    nickname: string | null;
  } | null;
}

interface AdminData {
  stats: AdminStats;
  rankings: RankingItem[];
  recentLogs: ActivityLog[];
}

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const result = await getAdminStats();
      if (result.error) {
        setError(result.error);
      } else if (result.stats) {
        setData({
          stats: result.stats,
          rankings: result.rankings as RankingItem[],
          recentLogs: result.recentLogs as ActivityLog[]
        });
      }
      setIsLoading(false);
    }
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-duo-snow">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-duo-green"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-duo-snow text-center">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-black text-duo-eel mb-2">접근 제한</h1>
        <p className="text-duo-wolf mb-6">{error}</p>
        <Link href="/" className="px-6 py-3 bg-duo-green text-white rounded-2xl font-black">
          메인으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-duo-snow p-4 sm:p-8 pb-20">
      {/* Header */}
      <header className="max-w-4xl mx-auto mb-8 flex items-center justify-between">
        <Link href="/" className="p-2 hover:bg-duo-swan rounded-xl transition-colors">
          <ArrowLeft className="w-6 h-6 text-duo-eel" />
        </Link>
        <h1 className="text-xl font-black text-duo-eel flex items-center gap-2">
          <Trophy className="w-6 h-6 text-duo-bee" /> 관리자 대시보드
        </h1>
        <div className="w-10"></div> {/* Spacer */}
      </header>

      <main className="max-w-4xl mx-auto space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-3xl border-2 border-duo-swan shadow-sm"
          >
            <Users className="w-8 h-8 text-blue-500 mb-2" />
            <p className="text-sm font-bold text-duo-wolf">총 가입자</p>
            <p className="text-2xl font-black text-duo-eel">{data.stats.totalUsers}명</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-3xl border-2 border-duo-swan shadow-sm"
          >
            <BookOpen className="w-8 h-8 text-duo-green mb-2" />
            <p className="text-sm font-bold text-duo-wolf">최근 학습량</p>
            <p className="text-2xl font-black text-duo-eel">{data.stats.totalLogs}건</p>
          </motion.div>
        </div>

        {/* User Rankings */}
        <section className="bg-white rounded-3xl border-2 border-duo-swan shadow-sm overflow-hidden">
          <div className="p-6 border-b-2 border-duo-snow">
            <h2 className="text-lg font-black text-duo-eel flex items-center gap-2">
              <Trophy className="w-5 h-5 text-duo-bee" /> 학습 챔피언 순위
            </h2>
          </div>
          <div className="divide-y-2 divide-duo-snow">
            {data.rankings.map((user: RankingItem, index: number) => (
              <div key={index} className="p-4 flex items-center justify-between hover:bg-duo-snow transition-colors">
                <div className="flex items-center gap-4">
                  <span className={`w-8 h-8 flex items-center justify-center rounded-full font-black text-white ${
                    index === 0 ? 'bg-duo-bee' : index === 1 ? 'bg-duo-wolf' : index === 2 ? 'bg-orange-400' : 'bg-duo-swan text-duo-wolf'
                  }`}>
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-black text-duo-eel">{user.nickname || '익명 탐험가'}</p>
                    <p className="text-xs font-bold text-duo-wolf">Stage {user.current_stage}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-duo-green">{user.total_score}점</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="bg-white rounded-3xl border-2 border-duo-swan shadow-sm overflow-hidden">
          <div className="p-6 border-b-2 border-duo-snow">
            <h2 className="text-lg font-black text-duo-eel flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" /> 실시간 탐험 현황
            </h2>
          </div>
          <div className="divide-y-2 divide-duo-snow">
            {data.recentLogs.map((log: ActivityLog, index: number) => (
              <div key={index} className="p-4 flex items-center gap-4 hover:bg-duo-snow transition-colors">
                <div className={`p-2 rounded-xl ${log.is_correct ? 'bg-green-100' : 'bg-red-100'}`}>
                  {log.is_correct ? (
                    <CheckCircle className="w-5 h-5 text-duo-green" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-duo-eel text-sm">
                    <span className="text-blue-600">@{log.profiles?.nickname || "탐험가"}</span>님이&nbsp;
                    <span className="font-black px-1">&quot;{log.word}&quot;</span>를&nbsp;
                    {log.is_correct ? "맞혔어요!" : "찾아봤어요."}
                  </p>
                  <p className="text-[10px] font-bold text-duo-wolf mt-1">
                    {new Date(log.learned_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
