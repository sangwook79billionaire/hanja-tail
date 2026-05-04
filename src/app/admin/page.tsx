"use client";

import { useEffect, useState } from "react";
import { getAdminStats, getUnverifiedWords, verifyWord, deleteWord } from "../actions";
import { 
  Users, 
  Database, 
  FileText, 
  Sparkles, 
  CheckCircle, 
  Trash2, 
  ArrowLeft,
  Loader2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

interface AdminStats {
  userCount: number;
  logCount: number;
  bankCount: number;
  cacheCount: number;
}

interface UnverifiedWord {
  word: string;
  hanja_list: { char: string; meaning: string; sound: string }[];
  created_at: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [unverifiedWords, setUnverifiedWords] = useState<UnverifiedWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [s, w] = await Promise.all([getAdminStats(), getUnverifiedWords()]);
        setStats(s as AdminStats);
        setUnverifiedWords(w as UnverifiedWord[]);
      } catch (err: unknown) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : "권한이 없거나 오류가 발생했습니다.";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleVerify = async (word: string) => {
    if (!confirm(`'${word}'을(를) 정식 퀴즈 뱅크에 등록할까요?`)) return;
    setActionLoading(word);
    const res = await verifyWord(word);
    if (res.success) {
      setUnverifiedWords(prev => prev.filter(w => w.word !== word));
      alert("등록되었습니다!");
    } else {
      alert("오류: " + res.error);
    }
    setActionLoading(null);
  };

  const handleDelete = async (word: string) => {
    if (!confirm(`'${word}' 분석 결과를 정말 삭제할까요?`)) return;
    setActionLoading(word);
    const res = await deleteWord(word);
    if (res.success) {
      setUnverifiedWords(prev => prev.filter(w => w.word !== word));
      alert("삭제되었습니다.");
    } else {
      alert("오류: " + res.error);
    }
    setActionLoading(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <Loader2 className="w-12 h-12 text-duo-macaw animate-spin mb-4" />
        <p className="text-duo-wolf font-black">데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-black text-duo-eel mb-2">접근 거부</h1>
        <p className="text-duo-wolf font-bold mb-8">{error}</p>
        <Link href="/" className="px-8 py-4 bg-duo-macaw text-white rounded-2xl font-black shadow-[0_4px_0_0_#1899d6]">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-duo-snow/30 pb-20 font-sans">
      {/* Header */}
      <header className="bg-white border-b-2 border-duo-snow sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-duo-snow rounded-xl transition-colors">
              <ArrowLeft className="w-6 h-6 text-duo-eel" />
            </Link>
            <h1 className="text-xl font-black text-duo-eel">관리자 대시보드</h1>
          </div>
          <div className="bg-duo-macaw/10 text-duo-macaw px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
            Admin Access
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <StatCard icon={<Users className="text-blue-500" />} label="전체 유저" value={stats.userCount} color="blue" />
            <StatCard icon={<FileText className="text-green-500" />} label="학습 로그" value={stats.logCount} color="green" />
            <StatCard icon={<Database className="text-purple-500" />} label="퀴즈 뱅크" value={stats.bankCount} color="purple" />
            <StatCard icon={<Sparkles className="text-orange-500" />} label="AI 캐시" value={stats.cacheCount} color="orange" />
          </div>
        )}

        {/* Section: Unverified Words */}
        <div className="bg-white border-3 border-duo-snow rounded-[40px] shadow-sm overflow-hidden">
          <div className="p-8 border-b-2 border-duo-snow flex items-center justify-between bg-white">
            <div>
              <h2 className="text-2xl font-black text-duo-eel">AI 신규 발견 단어</h2>
              <p className="text-sm font-bold text-duo-wolf mt-1">AI가 분석했지만 아직 정식 퀴즈로 등록되지 않은 {unverifiedWords.length}개의 단어입니다.</p>
            </div>
            <div className="hidden sm:block">
              <span className="text-[10px] font-black text-duo-macaw uppercase tracking-tighter bg-duo-macaw/10 px-3 py-1.5 rounded-lg">
                Validation Queue
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-duo-snow/50 text-[10px] font-black text-duo-swan uppercase tracking-widest">
                  <th className="px-8 py-4">단어</th>
                  <th className="px-8 py-4">한자 구성</th>
                  <th className="px-8 py-4">발견일</th>
                  <th className="px-8 py-4 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-duo-snow">
                {unverifiedWords.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-duo-wolf font-bold">
                      검토할 신규 단어가 없습니다. 🎉
                    </td>
                  </tr>
                ) : (
                  unverifiedWords.map((w, idx) => (
                    <tr key={idx} className="hover:bg-duo-snow/20 transition-colors group">
                      <td className="px-8 py-6">
                        <span className="text-lg font-black text-duo-eel">{w.word}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap gap-1">
                          {w.hanja_list?.map((h, i) => (
                            <span key={i} className="bg-white border border-duo-snow px-2 py-0.5 rounded-lg text-xs font-bold text-duo-wolf">
                              {h.char}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-sm font-bold text-duo-swan">{new Date(w.created_at).toLocaleDateString()}</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            disabled={actionLoading === w.word}
                            onClick={() => handleVerify(w.word)}
                            className="p-2.5 bg-green-100 text-duo-green rounded-xl hover:bg-duo-green hover:text-white transition-all shadow-sm"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button 
                            disabled={actionLoading === w.word}
                            onClick={() => handleDelete(w.word)}
                            className="p-2.5 bg-red-100 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number, color: "blue" | "green" | "purple" | "orange" }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 border-blue-100",
    green: "bg-green-50 border-green-100",
    purple: "bg-purple-50 border-purple-100",
    orange: "bg-orange-50 border-orange-100",
  };

  return (
    <div className={`p-6 rounded-[32px] border-2 bg-white shadow-sm flex items-center gap-4`}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-duo-swan uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-duo-eel">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}
