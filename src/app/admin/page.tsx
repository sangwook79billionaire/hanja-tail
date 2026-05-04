"use client";

import { useState, useEffect } from "react";
import { getAdminStats, getPendingWords, approveWord, deletePendingWord } from "../actions";
import { Users, BookOpen, Trophy, ArrowLeft, Clock, CheckCircle, XCircle, ShieldCheck, Trash2, ListChecks } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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

interface HanjaInfo {
  char: string;
  sound: string;
  meaning: string;
}

interface PendingWord {
  word: string;
  hanja_list: { char: string, sound: string, meaning: string }[];
  created_at: string;
}

type AdminTab = 'stats' | 'pending' | 'logs';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('stats');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [pendingWords, setPendingWords] = useState<PendingWord[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const res = await getAdminStats();
      if (res.error) {
        setError(res.error);
      } else {
        setStats(res.stats);
        setRankings(res.rankings);
        setRecentLogs(res.recentLogs);
        
        const pRes = await getPendingWords();
        if (pRes.pending) setPendingWords(pRes.pending);
      }
      setIsLoading(false);
    }
    fetchData();
  }, []);


  const handleApprove = async (word: string, hanjaList: HanjaInfo[]) => {
    if (!confirm(`'${word}' 단어를 공식 퀴즈 뱅크에 등록할까요?`)) return;
    const res = await approveWord(word, hanjaList);
    if (res.success) {
      alert("등록되었습니다!");
      setPendingWords(prev => prev.filter(p => p.word !== word));
    } else {
      alert("오류: " + res.error);
    }
  };

  const handleDelete = async (word: string) => {
    if (!confirm(`'${word}' 단어를 캐시에서 삭제할까요?`)) return;
    const res = await deletePendingWord(word);
    if (res.success) {
      setPendingWords(prev => prev.filter(p => p.word !== word));
    } else {
      alert("오류: " + res.error);
    }
  };

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
        <Link href="/" className="px-6 py-3 bg-duo-green text-white rounded-2xl font-black shadow-lg">
          메인으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-duo-snow flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b-2 border-duo-snow px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-duo-snow rounded-xl transition-colors">
            <ArrowLeft className="w-6 h-6 text-duo-eel" />
          </Link>
          <h1 className="text-xl font-black text-duo-eel flex items-center gap-2">
            <Trophy className="w-6 h-6 text-duo-bee" /> 관리자 대시보드
          </h1>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b-2 border-duo-snow px-6 flex items-center gap-8 h-14">
        {[
          { id: 'stats', label: '통계', icon: <Users className="w-5 h-5" /> },
          { id: 'pending', label: '미처리 단어', icon: <ListChecks className="w-5 h-5" />, count: pendingWords.length },
          { id: 'logs', label: '학습 로그', icon: <Clock className="w-5 h-5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AdminTab)}
            className={cn(
              "h-full flex items-center gap-2 border-b-4 transition-all px-2 relative",
              activeTab === tab.id 
                ? "border-duo-macaw text-duo-macaw font-black" 
                : "border-transparent text-duo-wolf font-bold hover:text-duo-eel"
            )}
          >
            {tab.icon} {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      <main className="flex-1 max-w-5xl mx-auto w-full p-6 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'stats' && (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[32px] border-3 border-duo-snow shadow-sm">
                  <Users className="w-10 h-10 text-blue-500 mb-4" />
                  <p className="text-sm font-black text-duo-wolf uppercase tracking-wider">총 탐험가</p>
                  <p className="text-4xl font-black text-duo-eel mt-1">{stats?.totalUsers || 0}명</p>
                </div>
                <div className="bg-white p-8 rounded-[32px] border-3 border-duo-snow shadow-sm">
                  <BookOpen className="w-10 h-10 text-duo-green mb-4" />
                  <p className="text-sm font-black text-duo-wolf uppercase tracking-wider">누적 학습 로그</p>
                  <p className="text-4xl font-black text-duo-eel mt-1">{stats?.totalLogs || 0}건</p>
                </div>
              </div>

              <section className="bg-white rounded-[40px] border-3 border-duo-snow shadow-sm overflow-hidden">
                <div className="p-8 border-b-3 border-duo-snow bg-duo-snow/30">
                  <h2 className="text-2xl font-black text-duo-eel flex items-center gap-3">
                    <Trophy className="w-8 h-8 text-duo-bee" /> 한자 탐험가 랭킹 (Top 10)
                  </h2>
                </div>
                <div className="divide-y-3 divide-duo-snow">
                  {rankings.map((user, idx) => (
                    <div key={idx} className="p-6 flex items-center justify-between hover:bg-duo-snow/30 transition-colors">
                      <div className="flex items-center gap-6">
                        <span className={cn(
                          "w-12 h-12 flex items-center justify-center rounded-2xl font-black text-xl shadow-sm",
                          idx === 0 ? "bg-duo-bee text-white shadow-[0_4px_0_0_#e5a500]" : 
                          idx === 1 ? "bg-duo-wolf text-white shadow-[0_4px_0_0_#4b4b4b]" :
                          idx === 2 ? "bg-orange-400 text-white shadow-[0_4px_0_0_#c2410c]" :
                          "bg-duo-snow text-duo-wolf"
                        )}>
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xl font-black text-duo-eel">{user.nickname || '익명 탐험가'}</p>
                          <p className="text-sm font-bold text-duo-wolf">스테이지 {user.current_stage}급</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-duo-green">{user.total_score}점</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'pending' && (
            <motion.div 
              key="pending"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-blue-50 border-3 border-blue-100 p-6 rounded-[32px] flex items-center gap-4">
                <ShieldCheck className="w-10 h-10 text-blue-500" />
                <div>
                  <h2 className="text-lg font-black text-blue-900">AI 생성 단어 검토</h2>
                  <p className="text-sm font-bold text-blue-700">AI가 분석한 신규 단어들을 공식 퀴즈 뱅크에 등록하거나 삭제할 수 있습니다.</p>
                </div>
              </div>

              {pendingWords.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-[40px] border-3 border-dashed border-duo-snow">
                  <CheckCircle className="w-16 h-16 text-duo-green mx-auto mb-4 opacity-30" />
                  <p className="text-xl font-black text-duo-wolf">검토할 단어가 없습니다!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pendingWords.map((p, i) => (
                    <motion.div 
                      key={p.word}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white border-3 border-duo-snow rounded-[32px] p-6 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-2xl font-black text-duo-eel">{p.word}</h3>
                          <span className="text-[10px] font-black bg-duo-snow px-2 py-1 rounded-lg text-duo-wolf uppercase">AI Generated</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-6">
                          {p.hanja_list.map((h, hi) => (
                            <div key={hi} className="bg-duo-snow/50 px-3 py-1.5 rounded-xl text-sm font-bold border border-duo-snow">
                              <span className="text-duo-eel font-black">{h.char}</span>
                              <span className="ml-1 text-duo-wolf text-xs">{h.sound}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-3 pt-4 border-t-2 border-duo-snow">
                        <button 
                          onClick={() => handleApprove(p.word, p.hanja_list)}
                          className="flex-1 h-12 bg-duo-macaw text-white rounded-2xl font-black text-sm shadow-[0_4px_0_0_#1899d6] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" /> 승인 및 등록
                        </button>
                        <button 
                          onClick={() => handleDelete(p.word)}
                          className="w-12 h-12 bg-white border-3 border-red-100 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'logs' && (
            <motion.div 
              key="logs"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-[40px] border-3 border-duo-snow shadow-sm overflow-hidden"
            >
              <div className="p-8 border-b-3 border-duo-snow bg-duo-snow/30 flex justify-between items-center">
                <h2 className="text-2xl font-black text-duo-eel flex items-center gap-3">
                  <Clock className="w-8 h-8 text-blue-500" /> 실시간 탐험 현황
                </h2>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs font-black text-duo-wolf uppercase">Live Activity</span>
                </div>
              </div>
              <div className="divide-y-3 divide-duo-snow">
                {recentLogs.map((log, index) => (
                  <div key={index} className="p-6 flex items-center gap-6 hover:bg-duo-snow/30 transition-colors">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm",
                      log.is_correct ? "bg-green-100 text-duo-green" : "bg-red-100 text-red-500"
                    )}>
                      {log.is_correct ? <CheckCircle className="w-7 h-7" /> : <XCircle className="w-7 h-7" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-bold text-duo-eel">
                        <span className="text-blue-600 font-black">@{log.profiles?.nickname || "탐험가"}</span>님이&nbsp;
                        <span className="font-black px-1.5 py-0.5 bg-duo-snow rounded-lg">&quot;{log.word}&quot;</span>를&nbsp;
                        {log.is_correct ? "정확히 맞혔어요! ✨" : "학습 중이에요. 🔍"}
                      </p>
                      <p className="text-xs font-bold text-duo-wolf mt-2 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {new Date(log.learned_at).toLocaleString('ko-KR', { 
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
